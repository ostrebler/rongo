import {
  CollectionInsertManyOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  OptionalId,
  WithId
} from "mongodb";
import { entries, isArray, isPlainObject } from "lodash";
import {
  Collection,
  Document,
  InsertionDoc,
  mapDeep,
  Rongo,
  stackToKey
} from "../.";

// This function is used to perform nested inserts :

export async function insertNested<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  options: CollectionInsertManyOptions | undefined,
  dependencies: DependencyCollector
) {
  const col = await collection.handle;
  const normalized = await normalizeInsertionDoc(collection, doc, dependencies);
  // TODO: Add verification step
  let result:
    | InsertOneWriteOpResult<WithId<T>>
    | InsertWriteOpResult<WithId<T>>;
  let documents: WithId<T> | Array<WithId<T>>;
  if (!isArray(normalized)) {
    result = await col.insertOne(normalized, options);
    documents = result.ops[0];
  } else {
    result = await col.insertMany(normalized, options);
    documents = result.ops;
  }
  dependencies.add(
    collection,
    await collection.resolve(collection.key, documents)
  );
  if (!result.result.ok)
    throw new Error(
      `Something went wrong in the MongoDB driver during insert in collection <${collection.name}>`
    );
  return documents;
}

// This function transforms an augmented insertion document into a simple insertion document

export function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  dependencies: DependencyCollector
): Promise<OptionalId<T> | Array<OptionalId<T>>> {
  return mapDeep(doc, async (value, stack) => {
    if (!isPlainObject(value)) return;
    // Get the foreign key config :
    const key = stackToKey(stack);
    const foreignKeyConfig = collection.foreignKeys[key];
    // If we're not visiting a foreign key location, finish there :
    if (!foreignKeyConfig) return;
    // Get the foreign collection :
    const foreignCol = collection.rongo.collection(foreignKeyConfig.collection);
    // Insert the nested document :
    const nestedDoc = await insertNested(foreignCol, value, {}, dependencies);
    // And return it's primary key
    return foreignCol.resolve(foreignCol.key, nestedDoc);
  });
}

// This class is used to collect document references across the database for nested insert clean-ups

export class DependencyCollector {
  private readonly rongo: Rongo;
  private dependencies: {
    [collection: string]: Array<any>;
  };

  constructor(rongo: Rongo) {
    this.rongo = rongo;
    this.dependencies = Object.create(null);
  }

  add(collection: Collection<any>, keys: any | Array<any>) {
    if (!(collection.name in this.dependencies))
      this.dependencies[collection.name] = [];
    this.dependencies[collection.name].push(...(isArray(keys) ? keys : [keys]));
  }

  async delete() {
    for (const [collectionName, keys] of entries(this.dependencies)) {
      const collection = this.rongo.collection(collectionName);
      const col = await collection.handle;
      await col.deleteMany({ [collection.key]: { $in: keys } });
    }
    this.dependencies = Object.create(null);
  }
}
