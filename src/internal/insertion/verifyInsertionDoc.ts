import { OptionalId } from "mongodb";
import { isArray } from "lodash";
import { Collection, Document, mapDeep, stackToKey } from "../../.";

// This function verifies the validity of an insertion doc by looking for dangling keys :

export async function verifyInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: OptionalId<T> | Array<OptionalId<T>>
) {
  await mapDeep(doc, async (value, stack) => {
    if (value === null || value === undefined) return;
    // Get the foreign key config :
    const key = stackToKey(stack);
    const foreignKeyConfig = collection.foreignKeys[key];
    // If we're not visiting a foreign key location, finish there :
    if (!foreignKeyConfig) return;
    // Get the foreign collection :
    const foreignCol = collection.rongo.collection(foreignKeyConfig.collection);

    const fail = (message: string) => {
      throw new Error(
        `Invalid foreign key(s) <${key}> in collection <${collection.name}> : ${message}`
      );
    };

    // Check the validity of the foreign key(s) :
    if (!isArray(value)) {
      if (await foreignCol.hasKey(value))
        return fail(
          `<${value}> isn't refering to an existing document in collection <${foreignCol.name}>`
        );
    } else {
      const nonNullValues = value.filter(item => item !== null);
      const difference =
        nonNullValues.length -
        (await foreignCol.count({
          [foreignCol.key]: { $in: nonNullValues }
        }));
      if (difference)
        return fail(
          `${difference} items aren't refering to existing documents in collection <${foreignCol.name}>`
        );
    }
    return value;
  });
}
