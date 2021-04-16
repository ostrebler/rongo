import { entries, isString } from "lodash";
import {
  createDefaultConfig,
  DeletePolicy,
  ForeignKeyConfig,
  Graph,
  InsertPolicy,
  isSchema,
  loadSchema,
  toPullUpdater,
  toSetUpdater
} from "../../.";

// This function transforms a schema configuration into an exploitable internal dependency graph

export function buildGraph(schema: unknown) {
  if (isString(schema)) schema = loadSchema(schema);
  if (!isSchema(schema))
    throw new Error(
      "The schema is invalid, please refer to the doc to make sure it has the correct structure and follows the expected key patterns"
    );

  const graph: Graph = Object.create(null);

  // For each collection in the schema :
  for (const [collection, partialConfig] of entries(schema)) {
    // If the collection is not already in the graph, create a default config for it :
    if (!(collection in graph)) graph[collection] = createDefaultConfig();
    const config = graph[collection];

    // Setup what we know regarding this collection at this point :
    config.key = partialConfig.key ?? "_id";

    // For each foreign key in the current collection :
    for (const [pathStr, pathConfig] of entries(
      partialConfig.foreignKeys ?? {}
    )) {
      const path = pathStr.split(".");
      const foreignKey = path.filter(route => route !== "$").join(".");

      // Create the updater pair in case of an update delete policy :
      let updater: ForeignKeyConfig["updater"] = null;
      switch (pathConfig.onDelete) {
        case DeletePolicy.Unset:
        case DeletePolicy.Nullify:
          updater = toSetUpdater(path);
          break;
        case DeletePolicy.Pull:
          updater = toPullUpdater(path);
      }

      // Create the config for the current foreign key :
      const foreignKeyConfig: ForeignKeyConfig = {
        path,
        updater,
        collection: pathConfig.collection ?? collection,
        onInsert: pathConfig.onInsert ?? InsertPolicy.Verify,
        onDelete: pathConfig.onDelete ?? DeletePolicy.Bypass
      };

      // Check for config coherence
      if (
        foreignKeyConfig.onDelete === DeletePolicy.Pull &&
        !path.includes("$")
      )
        throw new Error(
          `Foreign key <${foreignKey}> in collection <${collection}> can't implement the "Pull" remove policy`
        );

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
