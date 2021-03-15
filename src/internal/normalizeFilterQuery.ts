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
  return mapDeep(query, async function customizer(value, stack, parent) {
    if (isAugmentedSelector(value)) {
      const key = stackToKey(stack);
      // Get the foreign key config
      const foreignKeyConfig = collection.foreignKeys[key];
      if (!foreignKeyConfig)
        throw new Error(
          `No foreign key is set for <${key}> in collection <${collection.name}>`
        );
      // Get the foreign collection
      const foreignCol = collection.rongo.collection(
        foreignKeyConfig.collection
      );
      // This function returns a list of possible foreign keys given a foreign filter :
      const foreignKeys = (query: FilterQuery<any>, unique?: boolean) =>
        foreignCol.findResolve(
          query,
          foreignCol.primaryKey,
          unique ? { limit: 1 } : undefined
        );
      // If there is any augmented operator, they get merged with regular operators :
      let { $in, $nin, $$in, $$nin, $$eq, $$ne, ...props } = value;
      if ($$in) $in = [...($in ? $in : []), ...(await foreignKeys($$in))];
      if ($$nin) $nin = [...($nin ? $nin : []), ...(await foreignKeys($$nin))];
      if ($$eq) $in = [...($in ? $in : []), ...(await foreignKeys($$eq, true))];
      if ($$ne)
        $nin = [...($nin ? $nin : []), ...(await foreignKeys($$ne, true))];
      return {
        // The rest still needs to get recursively checked :
        ...(await mapDeep(props, customizer, stack, parent)),
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
