import { ObjectId } from "mongodb";
import { isString } from "lodash";
import { extname } from "path";
import { readFileSync } from "fs";
import YAML from "yaml";
import { CollectionConfig, Document, InsertionDoc, Stack } from "../.";

// ObjectId is being reexported for practicality

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

// This function loads a schema from a file

export function loadSchema(fileName: string): unknown {
  const extension = extname(fileName);
  const content = readFileSync(fileName).toString();
  switch (extension.toLowerCase()) {
    case ".json":
      return JSON.parse(content);
    case ".yaml":
    case ".yml":
      return YAML.parse(content);
    default:
      throw new Error(`Unknown file extension <${extension}> for Rongo schema`);
  }
}
