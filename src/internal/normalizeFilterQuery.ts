import { FilterQuery as FilterQueryBase } from "mongodb";
import { isArray, isPlainObject, last } from "lodash";
import { Collection, Document, FilterQuery, mapDeep, stackToKey } from "../.";

// This function transforms an augmented FilterQuery into a traditional FilterQuery

export async function normalizeFilterQuery<T extends Document>(
  collection: Collection<T>,
  query: FilterQuery<T>,
  options?: { baseQuery?: boolean }
): Promise<FilterQueryBase<T>> {
  if (options?.baseQuery) return query as FilterQueryBase<T>;
  return mapDeep(query, function customizer(value, stack) {
    switch (last(stack)) {
      // If there's an $expr, it has to be ignored by the normalizing process :
      case "$expr":
        return value;
      // If there's an $in or a $nin, process it :
      case "$in":
      case "$nin":
        // Check the current key :
        const key = stackToKey(stack);
        // Get the foreign key config if one exists :
        const foreignKeyConfig = collection.foreignKeys[key];
        // If we're at a foreign key location :
        if (foreignKeyConfig) {
          // Get the foreign collection :
          const foreignCol = collection.rongo.collection(
            foreignKeyConfig.collection
          );

          const primaryKeys = (query: FilterQuery<any>) =>
            foreignCol.find(query).select(foreignCol.key);

          // If we have a foreign filter query :
          if (isPlainObject(value)) return primaryKeys(value);
          // If we have an array of keys and/or foreign filter queries :
          if (isArray(value))
            return value.reduce<Promise<Array<any>>>(
              async (acc, item) =>
                isPlainObject(item)
                  ? [...(await acc), ...(await primaryKeys(item))]
                  : [...(await acc), item],
              Promise.resolve([])
            );
          // Otherwise, it's a misshaped query :
          throw new Error(
            `Invalid query selector for foreign key <${key}> in collection <${collection.name}> : <$in> and <$nin> selectors must be arrays or foreign filter queries`
          );
        }
    }
  });
}
