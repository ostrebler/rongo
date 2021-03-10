export { ObjectId } from "mongodb";
import { CollectionConfig, Graph, RemovePolicy, Schema } from ".";

export function processSchema(schema: Schema) {
  const graph: Graph = Object.create(null);

  const createDefaultConfig = (): CollectionConfig => ({
    primary: "_id",
    foreign: Object.create(null),
    reference: Object.create(null)
  });

  // For each collection in the schema :
  for (const [collection, partialColConfig] of Object.entries(schema)) {
    // If the collection is not already in the graph, create a default config for it :
    if (!(collection in graph)) graph[collection] = createDefaultConfig();
    const config = graph[collection];

    // Setup what we know regarding this collection at this point :
    config.primary = partialColConfig.primary ?? "_id";
    config.foreign = Object.create(null);

    // For each foreign key in the current collection :
    for (const [foreignKey, partialFKeyConfig] of Object.entries(
      partialColConfig.foreign ?? {}
    )) {
      // Create the config for the current foreign key :
      const foreignKeyConfig = {
        collection: partialFKeyConfig.collection ?? collection,
        nullable: partialFKeyConfig.nullable ?? false,
        optional: partialFKeyConfig.optional ?? false,
        onRemove: partialFKeyConfig.onRemove ?? RemovePolicy.ByPass
      };

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
