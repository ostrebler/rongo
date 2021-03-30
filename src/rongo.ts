import {
  Db,
  DbCollectionOptions,
  MongoClient,
  MongoClientOptions
} from "mongodb";
import { isString } from "lodash";
import { buildGraph, Collection, Document, Graph, loadSchema, Schema } from ".";

// The Rongo class

export class Rongo {
  readonly name: string;
  graph: Graph;
  readonly client: Promise<MongoClient>;
  readonly handle: Promise<Db>;
  active: boolean;

  constructor(uri: string, name: string, options?: MongoClientOptions) {
    this.name = name;
    this.graph = Object.create(null);
    this.client = MongoClient.connect(uri, {
      useUnifiedTopology: true,
      ...options
    });
    this.handle = this.client.then(client => client.db(name));
    this.active = false;
    this.client.then(client => {
      this.active = client.isConnected();
    });
  }

  schema(schema: Schema | string) {
    this.graph = buildGraph(isString(schema) ? loadSchema(schema) : schema);
  }

  collection<T extends Document>(
    name: string,
    options: DbCollectionOptions = {}
  ) {
    return new Collection<T>(this, name, options);
  }

  async drop() {
    const db = await this.handle;
    return db.dropDatabase();
  }

  async disconnect() {
    const client = await this.client;
    await client.close();
    this.active = client.isConnected();
  }
}
