import { ObjectId } from "mongodb";
import { isString } from "lodash";
import { CollectionConfig } from "../.";

export { ObjectId };

// This function creates a default collection config

export function createDefaultConfig(): CollectionConfig {
  return {
    primary: "_id",
    foreign: Object.create(null),
    reference: Object.create(null)
  };
}

// This function transforms a cloneOperator stack into an exploitable key

export function stackToKey(stack: Array<string | number>) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}
