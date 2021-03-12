import { OptionalId } from "mongodb";
import { get, isArray, isPlainObject, map } from "lodash";
import {
  cloneOperator,
  Collection,
  Document,
  InsertionDoc,
  stackToKey
} from "../.";

// This function transforms an augmented insertion document into a simple insertion document

export async function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T>
): Promise<OptionalId<T>> {
  return cloneOperator(doc, async (value, stack) => {
    if (isPlainObject(value) && value.$$insert) {
      const key = stackToKey(stack);
      // Get the foreign key config
      const foreignKeyConfig = collection.foreignKeys[key];
      if (!foreignKeyConfig)
        throw new Error(
          `No foreign key is set for <${key}> in collection <${collection.name}>`
        );
      // Insert the foreign doc(s)
      const foreignCol = collection.database.collection(
        foreignKeyConfig.collection
      );
      const document = await foreignCol.insert(value.$$insert);
      // Return the primary key(s)
      if (!isArray(document)) return get(document, foreignCol.primaryKey);
      return map(document, foreignCol.primaryKey);
    }
  });
}
