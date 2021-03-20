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
  name: string;
  graph: Graph;
  client: Promise<MongoClient>;
  handle: Promise<Db>;

  constructor(uri: string, name: string, options?: MongoClientOptions) {
    this.name = name;
    this.graph = Object.create(null);
    this.client = MongoClient.connect(uri, {
      useUnifiedTopology: true,
      ...options
    });
    this.handle = this.client.then(client => client.db(name));
  }

  async active() {
    const client = await this.client;
    return client.isConnected();
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
    return client.close();
  }
}
