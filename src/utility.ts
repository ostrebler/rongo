import { FilterQuery as FilterQueryBase, ObjectId } from "mongodb";
import { entries, fromPairs, isArray, isPlainObject, isString } from "lodash";
import {
  Collection,
  CollectionConfig,
  FilterQuery,
  Graph,
  RemovePolicy,
  Schema
} from ".";

export { ObjectId };

// This function transforms a schema configuration into an exploitable internal dependency graph

export function schemaToGraph(schema: Schema) {
  const graph: Graph = Object.create(null);

  const createDefaultConfig = (): CollectionConfig => ({
    primary: "_id",
    foreign: Object.create(null),
    reference: Object.create(null)
  });

  // For each collection in the schema :
  for (const [collection, partialColConfig] of entries(schema)) {
    // If the collection is not already in the graph, create a default config for it :
    if (!(collection in graph)) graph[collection] = createDefaultConfig();
    const config = graph[collection];

    // Setup what we know regarding this collection at this point :
    config.primary = partialColConfig.primary ?? "_id";
    config.foreign = Object.create(null);

    // For each foreign key in the current collection :
    for (const [path, pathConfig] of entries(partialColConfig.foreign ?? {})) {
      const foreignKey = path.replace(/(\.\$)+/g, "");

      // Create the config for the current foreign key :
      const foreignKeyConfig = {
        collection: pathConfig.collection ?? collection,
        path,
        nullable: pathConfig.nullable ?? false,
        optional: pathConfig.optional ?? false,
        onRemove: pathConfig.onRemove ?? RemovePolicy.ByPass
      };

      // Check for config coherence
      if (foreignKeyConfig.onRemove === RemovePolicy.Nullify)
        foreignKeyConfig.nullable = true;
      else if (foreignKeyConfig.onRemove === RemovePolicy.Unset) {
        foreignKeyConfig.optional = true;
        if (path.endsWith("$"))
          throw new Error(
            `Foreign key <${foreignKey}> in collection <${foreignKeyConfig.collection}> can't implement the "Unset" remove policy`
          );
      } else if (foreignKeyConfig.onRemove === RemovePolicy.Pull) {
        if (!path.includes("$"))
          throw new Error(
            `Foreign key <${foreignKey}> in collection <${foreignKeyConfig.collection}> can't implement the "Pull" remove policy`
          );
      }

      // Add the foreign key config to the current collection's config
      config.foreign[foreignKey] = foreignKeyConfig;

      // Now we need to set a reference on the target collection to this foreign key :
      const target = foreignKeyConfig.collection;
      if (!(target in graph)) graph[target] = createDefaultConfig();
      const reference = graph[target].reference;
      if (!(collection in reference))
        reference[collection] = Object.create(null);
      reference[collection][foreignKey] = foreignKeyConfig;
    }
  }

  return graph;
}

// This function is used to traverse, analyse and clone/transform augmented Mongo operators
// (query, update, projection, etc.)

export type Customizer = (
  value: any,
  stack: Array<string | number>,
  parent: any
) => any;

export async function cloneOperator(
  operator: object,
  customizer: Customizer,
  stack: Array<string | number> = [],
  parent: any = undefined
): Promise<any> {
  const result = await customizer(operator, stack, parent);

  // If this iteration gets a custom value, return it
  if (result !== undefined) return result;

  // If the current value is an array, it simply gets mapped with recursive calls
  if (isArray(operator))
    return Promise.all(
      operator.map((item, index) =>
        cloneOperator(item, customizer, [...stack, index], operator)
      )
    );
  // If the current value is a plain object, its values get mapped with recursive calls
  else if (isPlainObject(operator))
    return fromPairs(
      await Promise.all(
        entries(operator).map(
          async ([key, value]): Promise<[string, any]> => [
            key,
            await cloneOperator(value, customizer, [...stack, key], operator)
          ]
        )
      )
    );

  // Otherwise it's a primitive or other entity we don't need to traverse :
  return operator;
}

// This function transforms a cloneOperator stack into a foreign key

export function stackToKey(stack: Array<string | number>) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}

// This function transforms an augmented FilterQuery into a traditional FilterQuery

export async function normalizeFilterQuery<T extends object>(
  collection: Collection<T>,
  query: FilterQuery<T>
): Promise<FilterQueryBase<T>> {
  return cloneOperator(query, async (value, stack) => {
    // If there is a $$nin operation :
    if (value && value.$$in) {
      const { $$in, $in, ...props } = value;

      // Get the foreign key config of the current stack
      const foreignKey = stackToKey(stack);
      const foreignKeyConfig =
        collection.database.graph[collection.name].foreign[foreignKey];
      if (!foreignKeyConfig)
        throw new Error(
          `No foreign key is set for <${foreignKey}> in collection <${collection.name}>`
        );

      // Get the primary keys of the targeted foreign documents :
      const foreignCol = collection.database.collection(
        foreignKeyConfig.collection
      );
      const keys = await foreignCol.findMap(
        await normalizeFilterQuery(foreignCol, $$in),
        collection.database.graph[foreignKeyConfig.collection].primary
      );
      return {
        $in: [...($in ? $in : []), ...keys],
        ...props
      };
    }
    return undefined;
  });
}
