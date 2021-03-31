import { FilterQuery as FilterQueryBase } from "mongodb";
import { isArray, isPlainObject } from "lodash";
import { Collection, Document, FilterQuery, mapDeep, stackToKey } from "../.";

// This function transforms an augmented FilterQuery into a traditional FilterQuery

export function normalizeFilterQuery<T extends Document>(
  collection: Collection<T>,
  query: FilterQuery<T>
): Promise<FilterQueryBase<T>> {
  return mapDeep(query, async function customizer(value, stack, parent) {
    const key = stackToKey(stack);
    // Get the foreign key config :
    const foreignKeyConfig = collection.foreignKeys[key];
    // If there's anything to consider :
    if (foreignKeyConfig && isPlainObject(value) && (value.$in || value.$nin)) {
      // Get the foreign collection :
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );

      // If there is any foreign filter query, its primary keys get merged with the explicit keys :
      let { $in, $nin, ...props } = value;

      // This function transforms augmented $in-like values to regular values :
      const normalizeQuerySelectorList = (list: unknown) => {
        if (list === undefined) return undefined;
        // If it's a foreign filter query :
        if (isPlainObject(list))
          return findPrimaryKeys(foreignCol, list as FilterQuery<any>);
        // If it's an array of keys and/or foreign filter queries :
        if (isArray(list))
          return list.reduce<Promise<Array<any>>>(
            async (acc, item) =>
              isPlainObject(item)
                ? [...(await acc), ...(await findPrimaryKeys(foreignCol, item))]
                : [...(await acc), item],
            Promise.resolve([])
          );
        throw new Error(
          `Invalid query selector for foreign key <${key}> in collection <${collection.name}> : <$in> and <$nin> selectors must be arrays or foreign filter queries`
        );
      };

      $in = await normalizeQuerySelectorList($in);
      $nin = await normalizeQuerySelectorList($nin);

      return {
        // The rest still needs to get recursively checked :
        ...(await mapDeep(props, customizer, stack, parent)),
        ...($in && { $in }),
        ...($nin && { $nin })
      };
    }
  });
}

// This function returns the primary keys of the documents that match a given query

function findPrimaryKeys(collection: Collection<any>, query: FilterQuery<any>) {
  return collection.find(query).select(collection.primaryKey);
}
