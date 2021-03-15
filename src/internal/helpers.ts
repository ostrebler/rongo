import { ObjectId } from "mongodb";
import { isNaN, isString } from "lodash";
import {
  CollectionConfig,
  Document,
  InsertionDoc,
  Selector,
  Stack
} from "../.";

export { ObjectId };

// This function simply checks that the parameter being passed is of the correct type

export function is<T>(value: T) {
  return value;
}

// This function checks the type validity of an insertion document

export function isInsert<T extends Document>(
  doc: InsertionDoc<T>
): InsertionDoc<T>;

export function isInsert<T extends Document>(
  doc: Array<InsertionDoc<T>>
): Array<InsertionDoc<T>>;

export function isInsert<T extends Document>(
  doc: InsertionDoc<T> | Array<InsertionDoc<T>>
) {
  return doc;
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

export function stackToKey(stack: Stack) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}

// This function transforms a string into a valid selector

export function stringToSelector(selector: string): Selector {
  return selector
    .split(/[.\s]+/)
    .filter(route => route !== "")
    .map(route => {
      const index = parseInt(route);
      return isNaN(index) ? route : index;
    });
}
