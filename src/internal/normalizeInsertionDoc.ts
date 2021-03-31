import { OptionalId } from "mongodb";
import { entries, isArray, isPlainObject, last } from "lodash";
import {
  Collection,
  Document,
  InsertionDoc,
  InsertPolicy,
  mapDeep,
  Rongo,
  stackToKey
} from "../.";

// This function transforms an augmented insertion document into a simple insertion document

export function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  dependencies: DependencyCollector
): Promise<OptionalId<T> | Array<OptionalId<T>>> {
  return mapDeep(doc, async (value, stack) => {
    const key = stackToKey(stack);
    // Get the foreign key config :
    const foreignKeyConfig = collection.foreignKeys[key];
    // If we're not visiting a foreign key location, finish there :
    if (!foreignKeyConfig) return;
    // Get the foreign collection :
    const foreignCol = collection.rongo.collection(foreignKeyConfig.collection);

    // If the foreign key is undefined, check for optionality :
    if (value === undefined) {
      if (!foreignKeyConfig.optional)
        throw new Error(
          `Non-optional foreign key <${key}> in collection <${collection.name}> can't be undefined in insertion document`
        );
    }

    // If the foreign key is null, check for nullability :
    else if (value === null) {
      if (!foreignKeyConfig.nullable)
        throw new Error(
          `Non-nullable foreign key <${key}> in collection <${collection.name}> can't be null in insertion document`
        );
    }

    // If the foreign key is not an array of keys :
    else if (!isArray(value)) {
      // It has to be defined as a non-array foreign key :
      if (last(foreignKeyConfig.path) === "$")
        throw new Error(
          `Non-array values can't be assigned to array foreign key <${key}> in collection <${collection.name}>`
        );
      // Keys can't be plain objects, so if that's the case, it's a foreign insertion document :
      if (isPlainObject(value))
        value = await foreignCol
          .insert(value, {}, dependencies)
          .select(foreignCol.primaryKey);
      // If verification is on, check if "value" points to a valid foreign document :
      if (foreignKeyConfig.onInsert === InsertPolicy.Verify)
        if (!(await foreignCol.count({ [foreignCol.primaryKey]: value })))
          throw new Error(
            `Invalid foreign key <${key}> in insertion document for collection <${collection.name}> : no document with primary key <${value}> in collection<${foreignCol.name}>`
          );
    }

    // If the foreign key is an array of keys :
    else {
      // It has to be defined as an array foreign key :
      if (last(foreignKeyConfig.path) !== "$")
        throw new Error(
          `Non-array value can't be assigned to array foreign key <${key}> in collection <${collection.name}>`
        );
      // We map the array and replace foreign insertion documents with their actual primary key after insertion :
      value = await Promise.all(
        value.map(item => {
          if (!isPlainObject(item)) return item;
          return foreignCol
            .insert(item, {}, dependencies)
            .select(foreignCol.primaryKey);
        })
      );
      // If verification is on, check if every foreign key points to an actual foreign document :
      if (foreignKeyConfig.onInsert === InsertPolicy.Verify) {
        const count = await foreignCol.count({
          [foreignCol.primaryKey]: { $in: value }
        });
        if (value.length !== count)
          throw new Error(
            `Invalid foreign key <${key}> in insertion document for collection <${collection.name}> : some keys don't refer to actual documents in collection <${foreignCol.name}>`
          );
      }
    }

    // Return final ready foreign key(s) :
    return value;
  });
}

// This class is used to collect document references across the database (used for nested insert clean-ups)

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
      await collection.deleteMany({ [collection.primaryKey]: { $in: keys } });
    }
    this.dependencies = Object.create(null);
  }
}
