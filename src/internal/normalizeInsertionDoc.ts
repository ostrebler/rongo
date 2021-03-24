import { OptionalId } from "mongodb";
import { isArray, isPlainObject, last } from "lodash";
import {
  Collection,
  DependencyCollector,
  Document,
  InsertionDoc,
  InsertPolicy,
  mapDeep,
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
    const foreignKeyConfig = collection.foreignKeys[key];

    // If we're visiting a foreign key location :
    if (foreignKeyConfig) {
      // Get the foreign collection :
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );

      // If the foreign key is undefined, check for optionality and shortcut :
      if (value === undefined) {
        if (!foreignKeyConfig.optional)
          throw new Error(
            `Non-optional foreign key <${key}> in collection <${collection.name}> can't be undefined in insertion document`
          );
      }

      // If the foreign key is null, check for nullability and shortcut :
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
        if (isPlainObject(value)) {
          const doc = await foreignCol.insert(value, {}, dependencies);
          value = await foreignCol.resolve(doc, foreignCol.primaryKey);
        }

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
          value.map(async item => {
            if (!isPlainObject(item)) return item;
            const doc = await foreignCol.insert(item, {}, dependencies);
            return foreignCol.resolve(doc, foreignCol.primaryKey);
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
    }
  });
}
