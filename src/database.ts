import {
  ClientSession,
  Db,
  Document,
  MongoClient,
  RunCommandOptions,
  TransactionOptions
} from "mongodb";
import { keys } from "lodash-es";
import { Collection, DatabaseOptions, error } from ".";

export class Database<CollectionName extends string = string> {
  options: DatabaseOptions;
  client: MongoClient;
  db: Db;
  collections: Record<CollectionName, Collection<any>>;

  static create<CollectionName extends string>(
    options: DatabaseOptions<CollectionName>
  ) {
    return new Database<CollectionName>(options);
  }

  private constructor(options: DatabaseOptions<CollectionName>) {
    this.options = options;
    this.client = new MongoClient(options.url, options.clientOptions);
    const name = this.client.options.dbName;
    if (!name)
      throw error("Url must contain a database name", [
        "Database",
        "constructor"
      ]);
    this.db = this.client.db(name, options.dbOptions);
    this.collections = {} as any;
    for (const name of keys(options.collections)) {
      this.collections[name as CollectionName] = Collection.create(this, name);
    }
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
