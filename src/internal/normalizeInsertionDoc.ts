import { OptionalId } from "mongodb";
import { isArray, isPlainObject, last } from "lodash";
import {
  Collection,
  Document,
  InsertDependency,
  InsertionDoc,
  InsertPolicy,
  mapDeep,
  stackToKey
} from "../.";

// This function transforms an augmented insertion document into a simple insertion document

export function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  dependencies: InsertDependency
): Promise<OptionalId<T> | Array<OptionalId<T>>> {
  return mapDeep(doc, async (value, stack) => {
    const key = stackToKey(stack);
    const foreignKeyConfig = collection.foreignKeys[key];

    // If we're visiting a foreign key location :
    if (foreignKeyConfig) {
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );

      // If the foreing key is undefined, check for optionality and shortcut :
      if (value === undefined) {
        if (!foreignKeyConfig.optional)
          throw new Error(
            `Non-optional foreign key <${key}> in collection <${collection.name}> can't be undefined in insertion document`
          );
      }

      // If the foreing key is null, check for nullability and shortcut :
      else if (value === null) {
        if (!foreignKeyConfig.nullable)
          throw new Error(
            `Non-nullable foreign key <${key}> in collection <${collection.name}> can't be null in insertion document`
          );
      }

      // If the foreign key is not an array of keys :
      else if (last(foreignKeyConfig.path) !== "$") {
        // One can't affect an array to it :
        if (isArray(value))
          throw new Error(
            `Array value can't be assigned to non-array foreign key <${key}> in collection <${collection.name}>`
          );
        // Keys can't be plain objects, so if that's the case, it's a foreign insertion document :
        if (isPlainObject(value)) {
          const doc: any = await foreignCol.insert(value);
          value = await foreignCol.resolve(doc, foreignCol.primaryKey);
          dependencies.add(foreignCol, value);
        }

        // If verification is on, check if "value" points to a valid foreign document :
        if (
          foreignKeyConfig.onInsert === InsertPolicy.Verify &&
          !(await foreignCol.count({ [foreignCol.primaryKey]: value }))
        ) {
          throw new Error(
            `Invalid foreign key <${key}> in insertion document for collection <${collection.name}> : no foreign document with primary key <${value}>`
          );
        }
      }
      // If the foreign key is an array of keys :
      else {
        // One can't affect a non-array value to it (undefined and null cases handled above) :
        if (!isArray(value))
          throw new Error(
            `Non-array value can't be assigned to array foreign key <${key}> in collection <${collection.name}>`
          );
        // We map the array and replace foreign insertion documents with their actual primary key after insertion :
        value = await Promise.all(
          value.map(async item => {
            if (!isPlainObject(item)) return item;
            const doc: any = await foreignCol.insert(item);
            const key = await foreignCol.resolve(doc, foreignCol.primaryKey);
            dependencies.add(foreignCol, key);
            return key;
          })
        );

        // If verification is on, check if every foreign key points to an actual foreign document :
        if (foreignKeyConfig.onInsert === InsertPolicy.Verify) {
          const count = await foreignCol.count({
            [foreignCol.primaryKey]: { $in: value }
          });
          if (value.length !== count)
            throw new Error(
              `Invalid foreign key <${key}> in insertion document for collection <${collection.name}> : some keys don't refer to actual foreign documents`
            );
        }
      }

      // Return final, ready foreign key(s) :
      return value;
    }
  });
}
