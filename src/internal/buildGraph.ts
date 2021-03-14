import { entries } from "lodash";
import {
  createDefaultConfig,
  DeletePolicy,
  ForeignKeyConfig,
  Graph,
  InsertPolicy,
  Schema
} from "../.";

// This function transforms a schema configuration into an exploitable internal dependency graph

export function buildGraph(schema: Schema) {
  const graph: Graph = Object.create(null);

  // TODO: verify integrity of schema with JSON validator

  // For each collection in the schema :
  for (const [collection, partialConfig] of entries(schema)) {
    // If the collection is not already in the graph, create a default config for it :
    if (!(collection in graph)) graph[collection] = createDefaultConfig();
    const config = graph[collection];

    // Setup what we know regarding this collection at this point :
    config.primaryKey = partialConfig.primary ?? "_id";
    config.foreignKeys = Object.create(null);

    // For each foreign key in the current collection :
    for (const [path, pathConfig] of entries(partialConfig.foreign ?? {})) {
      const foreignKey = path.replace(/(\.\$)+/g, "");

      // Create the config for the current foreign key :
      const foreignKeyConfig: ForeignKeyConfig = {
        path,
        collection: pathConfig.collection ?? collection,
        nullable: pathConfig.nullable ?? false,
        optional: pathConfig.optional ?? false,
        onInsert: pathConfig.onInsert ?? InsertPolicy.Bypass,
        onDelete: pathConfig.onDelete ?? DeletePolicy.Bypass
      };

      // Check for config coherence
      if (foreignKeyConfig.onDelete === DeletePolicy.Nullify)
        foreignKeyConfig.nullable = true;
      else if (foreignKeyConfig.onDelete === DeletePolicy.Unset) {
        foreignKeyConfig.optional = true;
        if (path.endsWith("$"))
          throw new Error(
            `Foreign key <${foreignKey}> in collection <${collection}> can't implement the "Unset" remove policy`
          );
      } else if (foreignKeyConfig.onDelete === DeletePolicy.Pull) {
        if (!path.includes("$"))
          throw new Error(
            `Foreign key <${foreignKey}> in collection <${collection}> can't implement the "Pull" remove policy`
          );
      }

      // Add the foreign key config to the current collection's config
      config.foreignKeys[foreignKey] = foreignKeyConfig;

      // Now we need to set a reference on the target collection to this foreign key :
      const target = foreignKeyConfig.collection;
      if (!(target in graph)) graph[target] = createDefaultConfig();
      const references = graph[target].references;
      if (!(collection in references))
        references[collection] = Object.create(null);
      references[collection][foreignKey] = foreignKeyConfig;
    }
  }

  return graph;
}

// TODO: regex-check the primary and foreign keys
