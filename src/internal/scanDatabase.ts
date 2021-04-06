import {
  assignWith,
  differenceWith,
  entries,
  isEmpty,
  min,
  uniqBy
} from "lodash";
import { InvalidKeys, Rongo, ScanReport } from "../.";

// This function is used to find and collect all invalid keys in the database, revealing integrity problems

export async function scanDatabase(
  rongo: Rongo,
  options?: { batchSize?: number; limit?: number }
) {
  const report: ScanReport = Object.create(null);
  const batchSize = options?.batchSize ?? 100;

  // The following function is used to signal a new irregularity in the final report :
  const mergeReport = (
    colName: string,
    foreignKey: string,
    invalidKeys: Partial<InvalidKeys>
  ) => {
    if (!(colName in report)) report[colName] = Object.create(null);
    const foreignKeys = report[colName];
    if (!(foreignKey in foreignKeys))
      foreignKeys[foreignKey] = {
        invalidNull: false,
        invalidUnset: false,
        danglingKeys: []
      };
    assignWith(foreignKeys[foreignKey], invalidKeys, (k1, k2, prop) =>
      prop === "danglingKeys" ? [...k1, ...k2] : undefined
    );
  };

  // For each collection in the database :
  for (const [colName, config] of entries(rongo.graph)) {
    const collection = rongo.collection(colName);
    const size = await collection.count({}, { baseQuery: true });
    const maxSkip = min([size, options?.limit ?? Infinity])!;

    // For each batch of documents in that collection :
    for (let skip = 0; skip < maxSkip; skip += batchSize) {
      const documents = await collection.find(
        {},
        { baseQuery: true, skip, limit: batchSize }
      );
      // For each foreign key config in the collection :
      for (const [foreignKey, foreignKeyConfig] of entries(
        config.foreignKeys
      )) {
        // Get all values for that foreign key in the current batch :
        /*let keys: Array<any> = await collection.resolve(
          new FlatMapSelector(foreignKeyConfig.selector),
          documents
        );*/
        let keys: Array<any> = [];

        // If there is an unexpected nullish value, signal it :
        if (!foreignKeyConfig.optional && keys.includes(undefined))
          mergeReport(colName, foreignKey, { invalidUnset: true });
        if (!foreignKeyConfig.nullable && keys.includes(null))
          mergeReport(colName, foreignKey, { invalidNull: true });

        // Remove nullish and repeated values :
        keys = uniqBy(
          keys.filter(key => key !== null && key !== undefined),
          k => k.toString()
        );

        // Match these values with actual target primary keys in the foreign collection :
        const foreignCol = rongo.collection(foreignKeyConfig.collection);
        const primaryKeys: Array<any> = await foreignCol
          .find(
            { [foreignCol.key]: { $in: keys } },
            { baseQuery: true, projection: { [foreignCol.key]: 1 } }
          )
          .select(foreignCol.key);

        // If there are any dangling values, signal them :
        const danglingKeys = differenceWith(
          keys,
          primaryKeys,
          (k1, k2) => k1.toString() === k2.toString()
        );
        if (!isEmpty(danglingKeys))
          mergeReport(colName, foreignKey, { danglingKeys });
      }
    }
  }

  return report;
}
