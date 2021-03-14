import {
  Db,
  DbCollectionOptions,
  MongoClient,
  MongoClientOptions
} from "mongodb";
import { extname } from "path";
import { readFileSync } from "fs";
import YAML from "yaml";
import { isString } from "lodash";
import { buildGraph, Collection, Document } from ".";

export type Graph = {
  [collection: string]: CollectionConfig;
};

export type CollectionConfig = {
  primaryKey: string;
  foreignKeys: ForeignKeysConfig;
  references: {
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

// The Database class

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
    const parse = (fileName: string): Schema => {
      const content = readFileSync(fileName).toString();
      switch (extname(fileName)) {
        case ".json":
          return JSON.parse(content);
        case ".yaml":
        case ".yml":
          return YAML.parse(content);
        default:
          throw new Error(
            `Unknown file extension <${extname(fileName)}> for Rongo schema`
          );
      }
    };
    this.graph = buildGraph(isString(schema) ? parse(schema) : schema);
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
