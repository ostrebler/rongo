import { entries, isEmpty, keys } from "lodash";
import {
  Collection,
  FindReferencesOptions,
  IdentitySelector,
  References
} from "../.";

export async function findReferences(
  collection: Collection<any>,
  allKeys: Array<any>,
  options?: FindReferencesOptions
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

  // We start by applying the optional filters to the collection set to consider :
  const collections = options?.collections ?? [];
  const excludeCollections = options?.excludeCollections ?? [];

  let referenceEntries = entries(collection.references).filter(
    ([colName]) => !excludeCollections.includes(colName)
  );
  referenceEntries = isEmpty(collections)
    ? referenceEntries
    : referenceEntries.filter(([colName]) => collections.includes(colName));

  // For each collection that might reference the current collection :
  for (const [colName, foreignKeys] of referenceEntries) {
    // Get the collection :
    const refCol = collection.rongo.collection(colName);
    // For each relevant foreign key in that collection :
    for (const foreignKey of keys(foreignKeys)) {
      // Find all documents where the foreign key points to a key of interest :
      const result = await refCol
        .find(
          { [foreignKey]: { $in: allKeys } },
          {
            baseQuery: true,
            ...(options?.keysOnly && { projection: { [refCol.key]: 1 } })
          }
        )
        .select(options?.keysOnly ? refCol.key : new IdentitySelector());
      // Store the results is there are :
      if (!isEmpty(result)) mergeReference(colName, foreignKey, result);
    }
  }
  return references;
}
