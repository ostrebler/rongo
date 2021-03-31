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
  const keys = await filterKeys(collection, query, single, deletedKeys);

  if (!isEmpty(keys))
    for (const [colName, foreignKeys] of entries(collection.references))
      for (const [foreignKey, foreignKeyConfig] of entries(foreignKeys)) {
        const refCol = collection.rongo.collection(colName);
        const refQuery: FilterQuery<any> = { [foreignKey]: { $in: keys } };

        switch (foreignKeyConfig.onDelete) {
          case DeletePolicy.Reject:
            const count = await refCol.count(refQuery);
            if (count)
              throw new Error(
                `Remove operation in collection <${collection.name}> got rejected : Some foreign keys <${foreignKey}> in collection <${colName}> point to targeted documents`
              );
            break;

          case DeletePolicy.Remove:
            await propagateRemove(
              refCol,
              refQuery,
              false,
              scheduler,
              deletedKeys
            );
            break;

          case DeletePolicy.Unset:
            break;

          case DeletePolicy.Nullify:
            break;

          case DeletePolicy.Pull:
            break;
        }
      }

  const remover = async () => {
    const col = await collection.handle;
    return col.deleteMany({ [collection.primaryKey]: { $in: keys } });
  };
  scheduler.push(remover);
  return remover;
}

async function filterKeys(
  collection: Collection<any>,
  query: FilterQuery<any>,
  single: boolean,
  deletedKeys: DeletedKeys
) {
  if (!(collection.name in deletedKeys)) deletedKeys[collection.name] = [];
  const markedKeys = deletedKeys[collection.name];
  const keys: Array<any> = await collection
    .find(query, single ? { limit: 1 } : undefined)
    .select(collection.primaryKey);
  const keysToDelete = differenceWith(
    keys,
    markedKeys,
    (k1, k2) => k1.toString() === k2.toString()
  );
  markedKeys.push(...keysToDelete);
  return keysToDelete;
}
