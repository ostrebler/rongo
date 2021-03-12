import { ObjectId } from "mongodb";
import { isString } from "lodash";
import { CollectionConfig } from "../.";

export { ObjectId };

// This function creates a default collection config

export function createDefaultConfig(): CollectionConfig {
  return {
    primaryKey: "_id",
    foreignKeys: Object.create(null),
    references: Object.create(null)
  };
}

// This function transforms a cloneOperator stack into an exploitable key

export function stackToKey(stack: Array<string | number>) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}
