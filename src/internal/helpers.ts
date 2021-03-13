import { ObjectId } from "mongodb";
import { isNaN, isString } from "lodash";
import { CollectionConfig, Selector } from "../.";

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
