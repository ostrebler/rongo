import {
  CollectionInsertManyOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  WithId
} from "mongodb";
import { entries, isArray } from "lodash";
import {
  Collection,
  Document,
  InsertionDoc,
  normalizeInsertionDoc,
  Rongo,
  verifyInsertionDoc
} from "../../.";

// This function is used to perform nested inserts :

export async function insertNested<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  dependencies: DependencyCollector,
  options?: CollectionInsertManyOptions & { baseDocument?: boolean }
) {
  const col = await collection.handle;
  const normalized = await normalizeInsertionDoc(
    collection,
    doc,
    dependencies,
    options
  );
  await verifyInsertionDoc(collection, normalized);
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
    await collection.select(collection.key, documents)
  );
  if (!result.result.ok)
    throw new Error(
      `Something went wrong in the MongoDB driver during insert in collection <${collection.name}>`
    );
  return documents;
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
    for (const [colName, keys] of entries(this.dependencies)) {
      const collection = this.rongo.collection(colName);
      const col = await collection.handle;
      await col.deleteMany({ [collection.key]: { $in: keys } });
    }
    this.dependencies = Object.create(null);
  }
}
