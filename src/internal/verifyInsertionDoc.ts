import { OptionalId } from "mongodb";
import { isArray } from "lodash";
import { Collection, Document, InsertPolicy, mapDeep, stackToKey } from "../.";

// This function checks the insertion doc(s) against the foreign key configurations

export function verifyInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: OptionalId<T>
): Promise<OptionalId<T>> {
  return mapDeep(doc, async (value, stack) => {
    const key = stackToKey(stack);
    // Get the foreign key config
    const foreignKeyConfig = collection.foreignKeys[key];
    // If the key exists and has to be verified :
    if (foreignKeyConfig && foreignKeyConfig.onInsert === InsertPolicy.Verify) {
      // If the key path is set as being an array but the value is not, or vice versa : problem
      if (foreignKeyConfig.path.endsWith("$") !== isArray(value))
        throw new Error(
          `Insertion document for collection <${
            collection.name
          }> has ill-shaped foreign key <${key}> (should ${
            isArray(value) ? "not " : ""
          }be an array)`
        );
      // Otherwise check if the foreign keys are valid :
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );
      const foreignKeys = isArray(value) ? value : [value];
      if (
        foreignKeys.length !==
        (await foreignCol.count({
          [foreignCol.primaryKey]: { $in: foreignKeys }
        }))
      )
        throw new Error(
          `Insertion document for collection <${collection.name}> has foreign key(s) <${key}> that point to nothing`
        );
    }
  });
}
