import {
  ClientSession,
  Db,
  Document,
  MongoClient,
  RunCommandOptions,
  TransactionOptions
} from "mongodb";
import { keys } from "lodash-es";
import {
  AnySchemaMap,
  Collection,
  CollectionsOf,
  DatabaseConfig,
  error
} from "./index.js";

export class Database<SchemaMap extends AnySchemaMap> {
  config: DatabaseConfig<SchemaMap>;
  client: MongoClient;
  db: Db;
  collections: CollectionsOf<SchemaMap>;

  constructor(config: DatabaseConfig<SchemaMap>) {
    this.config = config;
    this.client = new MongoClient(config.url, config.clientOptions);
    const name = this.client.options.dbName;
    if (!name)
      throw error("Url must contain a database name", [
        "Database",
        "constructor"
      ]);
    this.db = this.client.db(name, config.dbOptions);
    const collections: any = {};
    for (const name of keys(config.collections)) {
      collections[name] = new Collection(name, this);
    }
    this.collections = collections;
  }

  get name() {
    return this.db.databaseName;
  }

  command(command: Document, options?: RunCommandOptions) {
    return this.db.command(command, options);
  }

  async atomic<T>(
    callback: (session: ClientSession) => Promise<T>,
    options?: TransactionOptions
  ) {
    const session = this.client.startSession();
    try {
      let value: T = undefined as never;
      await session.withTransaction(async session => {
        value = await callback(session);
      }, options);
      return value;
    } finally {
      await session.endSession();
    }
  }
}
