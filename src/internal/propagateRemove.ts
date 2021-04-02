import { CommonOptions, FilterQuery as FilterQueryBase } from "mongodb";
import { differenceWith, entries, isEmpty } from "lodash";
import {
  Collection,
  DeletedKeys,
  DeletePolicy,
  Document,
  Path,
  RemoveScheduler
} from "../.";

export async function propagateRemove<T extends Document>(
  collection: Collection<T>,
  query: FilterQueryBase<T>,
  single: boolean,
  options: CommonOptions | undefined,
  scheduler: RemoveScheduler,
  deletedKeys: DeletedKeys
) {
  // Get the primary keys that still need to be deleted :
  const keys = await getKeys(collection, query, single, deletedKeys);
  // If there are keys to delete, apply the appropriate delete policies to cross-collection references :
  if (!isEmpty(keys))
    for (const [colName, foreignKeys] of entries(collection.references))
      for (const [foreignKey, foreignKeyConfig] of entries(foreignKeys)) {
        // Get the foreign collection :
        const refCol = collection.rongo.collection(colName);
        const refHandler = await refCol.handle;
        const refQuery: FilterQueryBase<any> = { [foreignKey]: { $in: keys } };

        // If there's no reference to the current keys in the foreign collection, ignore that step :
        if (!(await refCol.has(refQuery))) continue;
        // Otherwise implement the appropriate delete policy :
        switch (foreignKeyConfig.onDelete) {
          case DeletePolicy.Reject:
            // Simply reject :
            throw new Error(
              `Remove operation in collection <${collection.name}> got rejected : Some foreign keys <${foreignKey}> in collection <${colName}> point to targeted documents`
            );

          case DeletePolicy.Remove:
            // Recursively propagate removal in reference collection :
            scheduler.push(
              await propagateRemove(
                refCol,
                refQuery,
                false,
                options,
                scheduler,
                deletedKeys
              )
            );
            break;

          case DeletePolicy.Unset:
            // Target relevant documents and unset where necessary :
            scheduler.push(() => {
              const [target, filter] = toSetUpdater(foreignKeyConfig.path);
              return refHandler.updateMany(
                refQuery,
                { $unset: { [target]: 1 } },
                filter
                  ? { arrayFilters: [{ [filter]: { $in: keys } }] }
                  : undefined
              );
            });
            break;

          case DeletePolicy.Nullify:
            // Target relevant documents and nullify where necessary :
            scheduler.push(() => {
              const [target, filter] = toSetUpdater(foreignKeyConfig.path);
              return refHandler.updateMany(
                refQuery,
                { $set: { [target]: null } },
                filter
                  ? { arrayFilters: [{ [filter]: { $in: keys } }] }
                  : undefined
              );
            });
            break;

          case DeletePolicy.Pull:
            // Target relevant documents and pull where necessary :
            scheduler.push(() => {
              const [target, filter] = toPullUpdater(foreignKeyConfig.path);
              return refHandler.updateMany(refQuery, {
                $pull: {
                  [target]: filter ? { [filter]: { $in: keys } } : { $in: keys }
                }
              });
            });
            break;
        }
      }
  // Finally, after clean-up, remove the documents that were still unmarked :
  return async () => {
    const col = await collection.handle;
    return col.deleteMany(
      { [collection.key]: { $in: keys } } as FilterQueryBase<T>,
      options
    );
  };
}

// This function gets the primary keys associated with a filter query and returns them after filtering
// out the ones already marked as deleted in deletedKeys

async function getKeys<T extends Document>(
  collection: Collection<T>,
  query: FilterQueryBase<T>,
  single: boolean,
  deletedKeys: DeletedKeys
) {
  if (!(collection.name in deletedKeys)) deletedKeys[collection.name] = [];
  const markedKeys = deletedKeys[collection.name];
  // Get the primary keys associated with the filter query :
  const keys: Array<any> = await collection
    .find(query, {
      ...(single && { limit: 1 }),
      projection: { [collection.key]: 1 }
    })
    .select(collection.key);
  // Subtract the keys already marked as deleted :
  const keysToDelete = differenceWith(
    keys,
    markedKeys,
    (k1, k2) => k1.toString() === k2.toString()
  );
  // Add the unmarked keys to the marked ones :
  markedKeys.push(...keysToDelete);
  // Return the unmarked keys :
  return keysToDelete;
}

/* This function transforms a key path to a valid [$set-like update query target, array filter] pair
 *
 * a           => a              | null
 * a.$         => a              | null
 * a.b         => a.b            | null
 * a.b.c       => a.b.c          | null
 * a.$.b       => a.$[f].b       | f.b
 * a.$.b.$     => a.$[f].b       | f.b
 * a.$.b.c     => a.$[f].b.c     | f.b.c
 * a.$.b.$.c   => a.$[].b.$[f].c | f.c
 * a.$.b.$.c.$ => a.$[].b.$[f].c | f.c
 * */

function toSetUpdater(path: Path) {
  const [target, filter] = [...path]
    .reverse()
    .reduce<[Array<string>, Array<string> | null]>(
      ([acc, filter], route, index) => {
        if (route !== "$") return [[route, ...acc], filter];
        if (index === 0) return [acc, filter];
        if (filter) return [["$[]", ...acc], filter];
        return [
          ["$[f]", ...acc],
          ["f", ...acc]
        ];
      },
      [[], null]
    );
  return [target.join("."), filter && filter.join(".")] as const;
}

/* This function transforms a key path to a valid [$pull-like update query target, element filter] pair
 *
 * a           => NEVER
 * a.$         => a              |
 * a.b         => NEVER
 * a.b.c       => NEVER
 * a.$.b       => a              | b
 * a.$.b.$     => a.$[].b        |
 * a.$.b.c     => a              | b.c
 * a.$.b.$.c   => a.$[].b        | c
 * a.$.b.$.c.$ => a.$[].b.$[].c  |
 * */

function toPullUpdater(path: Path) {
  const [target, filter] = [...path]
    .reverse()
    .reduce<[Array<string>, Array<string>, boolean]>(
      ([acc, filter, hit], route) => {
        if (route !== "$")
          return hit
            ? [[route, ...acc], filter, hit]
            : [acc, [route, ...filter], hit];
        if (!hit) return [acc, filter, true];
        return [["$[]", ...acc], filter, hit];
      },
      [[], [], false]
    );
  return [target.join("."), filter.join(".")] as const;
}
