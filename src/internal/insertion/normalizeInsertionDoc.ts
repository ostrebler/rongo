import { OptionalId } from "mongodb";
import { isPlainObject } from "lodash";
import {
  Collection,
  DependencyCollector,
  Document,
  InsertionDoc,
  insertNested,
  mapDeep,
  stackToKey
} from "../../.";

// This function transforms an augmented insertion document into a simple insertion document

export function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
  dependencies: DependencyCollector
): Promise<OptionalId<T> | Array<OptionalId<T>>> {
  return mapDeep(doc, async (value, stack) => {
    if (!isPlainObject(value)) return;
    // Get the foreign key config :
    const foreignKeyConfig = collection.foreignKeys[stackToKey(stack)];
    // If we're not visiting a foreign key location, finish there :
    if (!foreignKeyConfig) return;
    // Get the foreign collection :
    const foreignCol = collection.rongo.collection(foreignKeyConfig.collection);
    // Insert the nested document :
    const nestedDoc = await insertNested(foreignCol, value, {}, dependencies);
    // And return it's primary key
    return foreignCol.select(foreignCol.key, nestedDoc);
  });
}
