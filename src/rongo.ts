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
import { buildGraph, Collection, Document, Graph, Schema } from ".";

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
    const parse = (fileName: string): Schema => {
      const extension = extname(fileName);
      const content = readFileSync(fileName).toString();
      switch (extension) {
        case ".json":
          return JSON.parse(content);
        case ".yaml":
        case ".yml":
          return YAML.parse(content);
        default:
          throw new Error(
            `Unknown file extension <${extension}> for Rongo schema`
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

  async drop() {
    const db = await this.handle;
    return db.dropDatabase();
  }

  async disconnect() {
    const client = await this.client;
    return client.close();
  }
}
