import { OptionalId } from "mongodb";
import { isPlainObject } from "lodash";
import { Collection, Document, InsertionDoc, mapDeep, stackToKey } from "../.";

// This function transforms an augmented insertion document into a simple insertion document

export function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T>
): Promise<OptionalId<T>> {
  return mapDeep(doc, async (value, stack) => {
    if (isPlainObject(value) && value.$$insert) {
      const key = stackToKey(stack);
      // Get the foreign key config
      const foreignKeyConfig = collection.foreignKeys[key];
      if (!foreignKeyConfig)
        throw new Error(
          `No foreign key is set for <${key}> in collection <${collection.name}>`
        );
      // Insert the foreign doc(s)
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );
      const document = await foreignCol.insert(value.$$insert);
      // Return the primary key(s)
      return foreignCol.resolve(document, foreignCol.primaryKey);
    }
  });
}
