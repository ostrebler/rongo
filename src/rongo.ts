import {
  ChangeStreamOptions,
  ClientSession,
  CollectionCreateOptions,
  CommonOptions,
  Db,
  DbAddUserOptions,
  DbCollectionOptions,
  MongoClient,
  MongoClientOptions,
  ReadPreferenceOrMode
} from "mongodb";
import { isString } from "lodash";
import {
  buildGraph,
  Collection,
  databaseScan,
  Document,
  Graph,
  loadSchema,
  ObjectId,
  Schema
} from ".";

// The Rongo class

export class Rongo {
  readonly name: string;
  graph: Graph;
  readonly client: Promise<MongoClient>;
  readonly handle: Promise<Db>;
  isConnected: boolean;

  constructor(uri: string, name: string, options?: MongoClientOptions) {
    this.name = name;
    this.graph = Object.create(null);
    this.client = MongoClient.connect(uri, {
      useUnifiedTopology: true,
      ...options
    });
    this.handle = this.client.then(client => client.db(name));
    this.isConnected = false;
    this.client.then(client => {
      this.isConnected = client.isConnected();
    });
  }

  // Client methods :

  active() {
    return this.client;
  }

  async close() {
    const client = await this.client;
    await client.close();
    this.isConnected = client.isConnected();
  }

  // Database methods :

  async addUser(
    username: string,
    password: string,
    options?: DbAddUserOptions
  ) {
    const db = await this.handle;
    return db.addUser(username, password, options);
  }

  scan(options?: { batchSize?: number; limit?: number }) {
    return databaseScan(this, options);
  }

  collection<T extends Document>(name: string, options?: DbCollectionOptions) {
    return new Collection<T>(this, name, options);
  }

  async command(
    command: object,
    options?: { readPreference?: ReadPreferenceOrMode; session?: ClientSession }
  ) {
    const db = await this.handle;
    return db.command(command, options);
  }

  async createCollection<T extends Document>(
    name: string,
    options?: CollectionCreateOptions
  ) {
    const db = await this.handle;
    await db.createCollection(name, options);
    return this.collection<T>(name, options);
  }

  async drop() {
    const db = await this.handle;
    return db.dropDatabase();
  }

  async executeDbAdminCommand(
    command: object,
    options?: { readPreference?: ReadPreferenceOrMode; session?: ClientSession }
  ) {
    const db = await this.handle;
    return db.executeDbAdminCommand(command, options);
  }

  async listCollections(
    filter?: object,
    options?: {
      nameOnly?: boolean;
      batchSize?: number;
      readPreference?: ReadPreferenceOrMode;
      session?: ClientSession;
    }
  ) {
    const db = await this.handle;
    return db.listCollections(filter, options).toArray();
  }

  async removeUser(username: string, options?: CommonOptions) {
    const db = await this.handle;
    return db.removeUser(username, options);
  }

  schema(schema: Schema | string) {
    this.graph = buildGraph(isString(schema) ? loadSchema(schema) : schema);
  }

  async stats(options?: { scale?: number }) {
    const db = await this.handle;
    return db.stats(options);
  }

  async watch<T extends object = { _id: ObjectId }>(
    pipeline?: object[],
    options?: ChangeStreamOptions & { session?: ClientSession }
  ) {
    const db = await this.handle;
    return db.watch<T>(pipeline, options);
  }
}
