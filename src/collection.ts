import { BulkWriteOptions, InsertOneOptions } from "mongodb";
import { isArray } from "lodash-es";
import {
  AnySchemaMap,
  Database,
  error,
  InferBsonInsertType,
  MongoCollectionOf,
  OptionalId,
  rongo
} from "./index.js";

export class Collection<Name extends string, SchemaMap extends AnySchemaMap> {
  name: Name;
  database: Database<SchemaMap>;
  collection: MongoCollectionOf<Name, SchemaMap>;
  _ready: Promise<void>;

  constructor(name: Name, database: Database<SchemaMap>) {
    this.name = name;
    this.database = database;
    this.collection = database.db.collection(
      name,
      database.config.collections[name].collectionOptions
    );
    this._ready = this._prepare();
  }

  async _prepare() {
    await this._createIndex();
    await this._enforceSchema();
  }

  async _createIndex() {
    let { indexes = [] } = this.config;
    indexes = isArray(indexes) ? indexes : [indexes];
    await this.collection.createIndexes(indexes.map(index => ({ key: index })));
  }

  async _enforceSchema() {
    const { schema, validationLevel = "strict" } = this.config;
    await this.database.command({
      collMod: this.name,
      validator: { $jsonSchema: schema },
      validationLevel
    });
  }

  get config() {
    return this.database.config.collections[this.name];
  }

  async insertOne(
    document: InferBsonInsertType<SchemaMap[Name], SchemaMap>,
    options?: InsertOneOptions
  ) {
    await this._ready;
    const payload = {
      ...document,
      _id: document._id ?? rongo.id()
    } as T;
    await this.collection.insertOne(payload as any, options);
    return payload;
  }

  async insertMany(
    documents: OptionalId<T>[],
    options?: BulkWriteOptions & { rollback?: boolean }
  ) {
    await this._ready;
    const payload = documents.map(document => ({
      ...document,
      _id: document._id ?? rongo.id()
    })) as T[];

    const ordered = options?.ordered ?? true;
    const rollback = options?.rollback ?? ordered;

    if (!ordered) {
      if (rollback) {
        throw error("Rollback not supported with unordered inserts", [
          "Collection",
          "insertMany"
        ]);
      }
      await this.collection.insertMany(documents as any[], options);
    } else {
      await this.database.atomic(async () => {
        const result = await this.collection.insertMany(
          documents as [],
          options
        );
        if (result.insertedCount !== documents.length) {
          throw error("Multiple", ["Collection", "insertMany"]);
        }
      });
    }
    return payload;
  }

  async deleteByIds(ids: T["_id"]) {}
}
