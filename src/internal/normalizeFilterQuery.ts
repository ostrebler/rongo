import { FilterQuery as FilterQueryBase } from "mongodb";
import { isPlainObject } from "lodash";
import {
  Collection,
  Document,
  FilterQuery,
  mapDeep,
  QuerySelector,
  stackToKey
} from "../.";

// This function transforms an augmented FilterQuery into a traditional FilterQuery

export function normalizeFilterQuery<T extends Document>(
  collection: Collection<T>,
  query: FilterQuery<T>
): Promise<FilterQueryBase<T>> {
  return mapDeep(query, async function customizer(value, stack) {
    if (isAugmentedSelector(value)) {
      const key = stackToKey(stack);
      let { $in, $nin, $$in, $$nin, $$eq, $$ne, ...props } = value;
      // If there is any augmented operator, they get merged with regular operators :
      if ($$in)
        $in = [
          ...($in ? $in : []),
          ...(await findForeignKeys(collection, key, $$in))
        ];
      if ($$nin)
        $nin = [
          ...($nin ? $nin : []),
          ...(await findForeignKeys(collection, key, $$nin))
        ];
      if ($$eq)
        $in = [
          ...($in ? $in : []),
          ...(await findForeignKeys(collection, key, $$eq, true))
        ];
      if ($$ne)
        $nin = [
          ...($nin ? $nin : []),
          ...(await findForeignKeys(collection, key, $$ne, true))
        ];
      return {
        // The rest still needs to get recursively checked :
        ...(await mapDeep(props, customizer)),
        ...($in && { $in }),
        ...($nin && { $nin })
      };
    }
  });
}

// This function checks if an object is an augmented query selector

export function isAugmentedSelector(entity: any): entity is QuerySelector<any> {
  return (
    isPlainObject(entity) &&
    (entity.$$in || entity.$$nin || entity.$$eq || entity.$$ne)
  );
}

// This function returns a list of possible foreign keys given a collection, one of its foreign key,
// and a filter query for the foreign collection

export function findForeignKeys<T extends Document>(
  collection: Collection<T>,
  foreignKey: string,
  foreignQuery: FilterQuery<any>,
  unique?: boolean
) {
  const database = collection.database;
  // Get the foreign key config
  const foreignKeyConfig = collection.foreignKeys[foreignKey];
  if (!foreignKeyConfig)
    throw new Error(
      `No foreign key is set for <${foreignKey}> in collection <${collection.name}>`
    );
  // Get the primary keys of the targeted foreign documents :
  const foreignCol = database.collection(foreignKeyConfig.collection);
  return foreignCol.findResolve(
    foreignQuery,
    foreignCol.primaryKey,
    unique ? { limit: 1 } : undefined
  );
}
