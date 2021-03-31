import { differenceWith, entries, isEmpty } from "lodash";
import {
  Collection,
  DeletedKeys,
  DeletePolicy,
  FilterQuery,
  RemoveScheduler
} from "../.";

export async function propagateRemove(
  collection: Collection<any>,
  query: FilterQuery<any>,
  single: boolean,
  scheduler: RemoveScheduler,
  deletedKeys: DeletedKeys
) {
  const keys = await getKeys(collection, query, single, deletedKeys);

  if (!isEmpty(keys))
    for (const [colName, foreignKeys] of entries(collection.references))
      for (const [foreignKey, foreignKeyConfig] of entries(foreignKeys)) {
        const refCol = collection.rongo.collection(colName);
        const refQuery: FilterQuery<any> = { [foreignKey]: { $in: keys } };

        switch (foreignKeyConfig.onDelete) {
          case DeletePolicy.Reject:
            if (await refCol.has(refQuery))
              throw new Error(
                `Remove operation in collection <${collection.name}> got rejected : Some foreign keys <${foreignKey}> in collection <${colName}> point to targeted documents`
              );
            break;

          case DeletePolicy.Remove:
            const remover = await propagateRemove(
              refCol,
              refQuery,
              false,
              scheduler,
              deletedKeys
            );
            scheduler.push(remover);
            break;

          case DeletePolicy.Unset:
            break;

          case DeletePolicy.Nullify:
            break;

          case DeletePolicy.Pull:
            break;
        }
      }

  return async () => {
    const col = await collection.handle;
    return col.deleteMany({ [collection.primaryKey]: { $in: keys } });
  };
}

async function getKeys(
  collection: Collection<any>,
  query: FilterQuery<any>,
  single: boolean,
  deletedKeys: DeletedKeys
) {
  if (!(collection.name in deletedKeys)) deletedKeys[collection.name] = [];
  const markedKeys = deletedKeys[collection.name];
  const keys: Array<any> = await collection
    .find(query, {
      ...(single && { limit: 1 }),
      projection: { [collection.primaryKey]: 1 }
    })
    .select(collection.primaryKey);
  const keysToDelete = differenceWith(
    keys,
    markedKeys,
    (k1, k2) => k1.toString() === k2.toString()
  );
  markedKeys.push(...keysToDelete);
  return keysToDelete;
}
