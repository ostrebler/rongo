import {
  CollectionOptions as MongoCollectionOptions,
  DbOptions,
  IndexDirection,
  MongoClientOptions
} from "mongodb";
import { Collection, Database, rongo } from ".";

export interface DatabaseOptions<CollectionName extends string = string> {
  url: string;
  collections: Record<CollectionName, CollectionOptions>;
  clientOptions?: MongoClientOptions;
  dbOptions?: DbOptions;
}

export interface CollectionOptions {
  indexes?: Index | Index[];
  schema: Schema;
  schemaLevel?: SchemaLevel;
  collectionOptions?: MongoCollectionOptions;
}

export interface Index {
  [key: string]: IndexDirection;
}

export interface Schema {
  [key: string]: any;
}

export enum SchemaLevel {
  Strict = "strict",
  Moderate = "moderate",
  Off = "off"
}

export interface Plugin<Options = any> {
  applied?: boolean;
  (
    rongoFunction: typeof rongo,
    databaseClass: typeof Database,
    collectionClass: typeof Collection,
    options?: Options
  ): void;
}
