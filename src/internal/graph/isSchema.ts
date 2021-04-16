import Ajv from "ajv";
import { values } from "lodash";
import { DeletePolicy, InsertPolicy, Schema } from "../../.";

const id = "([a-zA-Z_-][a-zA-Z0-9_-]*)";

// This callback is used to validate the JSON structure of a schema

export const isSchema = new Ajv().compile<Schema>({
  type: "object",
  additionalProperties: false,
  patternProperties: {
    [`^${id}$`]: {
      type: "object",
      additionalProperties: false,
      properties: {
        key: {
          type: "string",
          pattern: `^${id}(\\.${id})*$`
        },
        foreignKeys: {
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
