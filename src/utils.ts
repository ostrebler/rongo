import { Collection as MongoCollection } from "mongodb";
import { AnySchemaMap, Collection, InferBsonType } from "./index.js";

// Helpers

export function error(message: string, path: string[] = []) {
  throw new Error(`${["Rongo", ...path].join(" > ")}: ${message}`);
}

// Types

export type CollectionsOf<SchemaMap extends AnySchemaMap> = {
  [Name in keyof SchemaMap & string]: Collection<Name, SchemaMap>;
};

export type MongoCollectionOf<
  Name extends string,
  SchemaMap extends AnySchemaMap
> = MongoCollection<InferBsonType<SchemaMap[Name], SchemaMap>>;
