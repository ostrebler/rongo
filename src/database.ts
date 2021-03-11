import { Db, DbCollectionOptions, MongoClient } from "mongodb";
import { Collection, schemaToGraph } from ".";

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
  collection: string;
  path: string;
  nullable: boolean;
  optional: boolean;
  onRemove: RemovePolicy;
};

export type Schema = {
  [collection: string]: {
    primary?: string;
    foreign?: {
      [foreignKeyPath: string]: {
        collection?: string;
        nullable?: boolean;
        optional?: boolean;
        onRemove?: RemovePolicy;
      };
    };
  };
};

export enum RemovePolicy {
  ByPass,
  Reject, // *
  Remove, // *
  Nullify, // * (and "nullable" must be true)
  Unset, // x.**.y (and "optional" must be true)
  Pull // x.**.$ | x.**.$.**.y
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

  async connect(url: string, name: string) {
    this.name = name;
    const client = await MongoClient.connect(url, {
      useUnifiedTopology: true
    });
    this._resolveHandle(client.db(name));
  }

  schema(schema: Schema) {
    this.graph = schemaToGraph(schema);
  }

  collection<T extends object>(
    name: string,
    options: DbCollectionOptions = {}
  ) {
    return new Collection<T>(this, name, options);
  }

  drop() {
    return this.handle.then(db => db.dropDatabase());
  }
}
