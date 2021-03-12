import { OptionalId } from "mongodb";
import { isPlainObject } from "lodash";
import {
  cloneOperator,
  Collection,
  Document,
  InsertionDoc,
  stackToKey
} from "../.";

// This function inserts foreign document(s) and returns its/their primary key

export async function insertForeignDoc<T>(
  collection: Collection<T>,
  foreignKey: string,
  foreignDoc: InsertionDoc<any> | Array<InsertionDoc<any>>
) {
  type A = InsertionDoc<any>;

  const database = collection.database;
  // Get the foreign key config
  const foreignKeyConfig = database.graph[collection.name].foreign[foreignKey];
  if (!foreignKeyConfig)
    throw new Error(
      `No foreign key is set for <${foreignKey}> in collection <${collection.name}>`
    );
  // Insert the foreign doc(s)
  const foreignCol = database.collection(foreignKeyConfig.collection);
  const documents = await foreignCol.insert(foreignDoc);
}

// This function transforms an augmented insertion document into a simple insertion document

export async function normalizeInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: InsertionDoc<T>
): Promise<OptionalId<T>> {
  return cloneOperator(doc, async function customizer(value, stack) {
    if (isPlainObject(value) && value.$$insert) {
      const key = stackToKey(stack);
      return insertForeignDoc(collection, key, value.$$insert);
    }
  });
}
