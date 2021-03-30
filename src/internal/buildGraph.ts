import { entries, values } from "lodash";
import Ajv from "ajv";
import {
  createDefaultConfig,
  DeletePolicy,
  ForeignKeyConfig,
  Graph,
  InsertPolicy,
  Schema
} from "../.";

// This function transforms a schema configuration into an exploitable internal dependency graph

export function buildGraph(schema: unknown) {
  if (!isSchema(schema))
    throw new Error(
      "The schema is invalid, please refer to the doc make sure it has the correct structure and follows the expected key patterns"
    );

  const graph: Graph = Object.create(null);

  // For each collection in the schema :
  for (const [collection, partialConfig] of entries(schema)) {
    // If the collection is not already in the graph, create a default config for it :
    if (!(collection in graph)) graph[collection] = createDefaultConfig();
    const config = graph[collection];

    // Setup what we know regarding this collection at this point :
    config.primaryKey = partialConfig.primary ?? "_id";
    config.foreignKeys = Object.create(null);

    // For each foreign key in the current collection :
    for (const [pathStr, pathConfig] of entries(partialConfig.foreign ?? {})) {
      const path = pathStr.split(".");
      const foreignKey = path.filter(route => route !== "$").join(".");

      // Create the config for the current foreign key :
      const foreignKeyConfig: ForeignKeyConfig = {
        path,
        collection: pathConfig.collection ?? collection,
        optional: pathConfig.optional ?? false,
        nullable: pathConfig.nullable ?? false,
        onInsert: pathConfig.onInsert ?? InsertPolicy.Bypass,
        onDelete: pathConfig.onDelete ?? DeletePolicy.Bypass
      };

      // Check for config coherence
      if (foreignKeyConfig.onDelete === DeletePolicy.Unset)
        foreignKeyConfig.optional = true;
      if (foreignKeyConfig.onDelete === DeletePolicy.Nullify)
        foreignKeyConfig.nullable = true;
      if (foreignKeyConfig.onDelete === DeletePolicy.Pull) {
        if (!path.includes("$"))
          throw new Error(
            `Foreign key <${foreignKey}> in collection <${collection}> can't implement the Pull or NullifyIn remove policy`
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

// This callback is used to validate the JSON structure of a schema

const id = "([a-zA-Z_-][a-zA-Z0-9_-]*)";

const isSchema = new Ajv().compile<Schema>({
  type: "object",
  additionalProperties: false,
  patternProperties: {
    [`^${id}$`]: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: {
          type: "string",
          pattern: `^${id}(\\.${id})*$`
        },
        foreign: {
          type: "object",
          additionalProperties: false,
          patternProperties: {
            [`^${id}(\\.(${id}|\\$))*$`]: {
              type: "object",
              additionalProperties: false,
              properties: {
                collection: {
                  type: "string",
                  pattern: `^${id}$`
                },
                optional: {
                  type: "boolean"
                },
                nullable: {
                  type: "boolean"
                },
                onInsert: {
                  enum: values(InsertPolicy)
                },
                onDelete: {
                  enum: values(DeletePolicy)
                }
              }
            }
          }
        }
      }
    }
  }
});
