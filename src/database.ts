import {
  Db,
  DbCollectionOptions,
  MongoClient,
  MongoClientOptions
} from "mongodb";
import { readFileSync } from "fs";
import { isString } from "lodash";
import { buildGraph, Collection, Document } from ".";

export type Graph = {
  [collection: string]: CollectionConfig;
};

export type CollectionConfig = {
  primary: string;
  foreign: ForeignKeysConfig;
  reference: {
    [collection: string]: ForeignKeysConfig;
  };
};

export type ForeignKeysConfig = {
  [foreignKey: string]: ForeignKeyConfig;
};

export type ForeignKeyConfig = {
  path: string;
  collection: string;
  nullable: boolean;
  optional: boolean;
  onDelete: DeletePolicy;
};

export type Schema = {
  [collection: string]: {
    primary?: string;
    foreign?: {
      [foreignKeyPath: string]: {
        collection?: string;
        nullable?: boolean;
        optional?: boolean;
        onDelete?: DeletePolicy;
      };
    };
  };
};

export enum DeletePolicy {
  Bypass = "BYPASS",
  Reject = "REJECT", // *
  Remove = "REMOVE", // *
  Nullify = "NULLIFY", // * (and "nullable" must be true)
  Unset = "UNSET", // x.**.y (and "optional" must be true)
  Pull = "PULL" // x.**.$ | x.**.$.**.y
}

export class Database {
  name: string | null;
  graph: Graph;
  handle: Promise<Db>;
  private _resolveHandle: (db: Db) => void;

  constructor() {
    this.name = null;
    this.graph = Object.create(null);
    this._resolveHandle = () => undefined;
    this.handle = new Promise<Db>(resolve => {
      this._resolveHandle = resolve;
    });
  }

  async connect(url: string, name: string, options?: MongoClientOptions) {
    this.name = name;
    const client = await MongoClient.connect(url, {
      useUnifiedTopology: true,
      ...options
    });
    this._resolveHandle(client.db(name));
  }

  schema(schema: Schema | string) {
    this.graph = buildGraph(
      isString(schema) ? JSON.parse(readFileSync(schema).toString()) : schema
    );
  }

  collection<T extends Document>(
    name: string,
    options: DbCollectionOptions = {}
  ) {
    return new Collection<T>(this, name, options);
  }

  drop() {
    return this.handle.then(db => db.dropDatabase());
  }
}
