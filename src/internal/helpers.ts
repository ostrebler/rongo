import { ObjectId } from "mongodb";
import { isNaN, isString } from "lodash";
import { CollectionConfig, Selector } from "../.";

export { ObjectId };

// This function simply checks that the parameter being passed is of the correct type
// (useful for nested $$insert for example)

export function is<T>(value: T) {
  return value;
}

// This function creates a default collection config

export function createDefaultConfig(): CollectionConfig {
  return {
    primaryKey: "_id",
    foreignKeys: Object.create(null),
    references: Object.create(null)
  };
}

// This function transforms a mapDeep-like stack into an exploitable key

export function stackToKey(stack: Array<string | number>) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}

// This function transforms a string into a valid selector

export function stringToSelector(selector: string): Selector {
  return selector
    .split(/[.\n]/)
    .map(fragment => fragment.replace(/\s+/g, ""))
    .filter(route => route !== "")
    .map(route => {
      const index = parseInt(route);
      return isNaN(index) ? route : index;
    });
}
