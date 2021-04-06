import { entries, isEmpty, keys } from "lodash";
import { Collection, References } from "../.";

export async function findReferences(
  collection: Collection<any>,
  allKeys: Array<any>,
  options?: { keysOnly?: boolean }
) {
  const references: References = Object.create(null);

  // The following method adds new documents to the reference set :
  const mergeReference = (
    colName: string,
    foreignKey: string,
    refs: Array<any>
  ) => {
    if (!(colName in references)) references[colName] = Object.create(null);
    const foreignKeys = references[colName];
    if (!(foreignKey in foreignKeys)) foreignKeys[foreignKey] = [];
    foreignKeys[foreignKey].push(...refs);
  };

  // For each collection that might reference the current collection :
  for (const [colName, foreignKeys] of entries(collection.references)) {
    // Get the collection :
    const refCol = collection.rongo.collection(colName);
    // For each relevant foreign key in that collection :
    for (const foreignKey of keys(foreignKeys)) {
      // Find all documents where the foreign key points to a key of interest :
      const promise = refCol.find(
        { [foreignKey]: { $in: allKeys } },
        {
          baseQuery: true,
          ...(options?.keysOnly && { projection: { [refCol.key]: 1 } })
        }
      );
      // Store the results is there are :
      const result = await (options?.keysOnly
        ? promise
        : promise.select(refCol.key));
      if (!isEmpty(result)) mergeReference(colName, foreignKey, result);
    }
  }
  return references;
}
