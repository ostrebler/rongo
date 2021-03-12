import {
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  DbCollectionOptions,
  FindOneOptions,
  MongoCountPreferences,
  OptionalId
} from "mongodb";
import { get, map } from "lodash";
import {
  createDefaultConfig,
  Database,
  FilterQuery,
  normalizeFilterQuery
} from ".";

export type DocumentT = Record<string, any>;

export class Collection<T extends DocumentT> {
  database: Database;
  name: string;
  handle: Promise<Col<T>>;

  constructor(
    database: Database,
    name: string,
    options: DbCollectionOptions = {}
  ) {
    this.database = database;
    this.name = name;
    this.handle = database.handle.then(db => db.collection<T>(name, options));
    if (!(name in database.graph)) database.graph[name] = createDefaultConfig();
  }

  // Query methods :

  async aggregate<U = T>(
    pipeline?: object[],
    options?: CollectionAggregationOptions
  ) {
    const col = await this.handle;
    return col.aggregate<U>(pipeline, options).toArray();
  }

  async count(query: FilterQuery<T> = {}, options?: MongoCountPreferences) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col.countDocuments(normalized, options);
  }

  async find<U = T>(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col.find(normalized, options ?? {}).toArray();
  }

  async findOne<U = T>(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col.findOne(normalized, options);
  }

  async findMap<U = T, K extends keyof U = keyof U>(
    query: FilterQuery<T>,
    key: K,
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    const array = await this.find(query, {
      ...options,
      fields: { [key]: 1 } as any
    });
    return map(array, key);
  }

  async findOneMap<U = T, K extends keyof U = keyof U>(
    query: FilterQuery<T>,
    key: K,
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    const document = await this.findOne(query, {
      ...options,
      fields: { [key]: 1 } as any
    });
    if (document === null)
      throw new Error(
        `Could not find document in collection <${this.name}>.findOneMap`
      );
    return get(document, key) as U[K];
  }

  // Insert methods :

  async insertOne(doc: OptionalId<T>, options?: CollectionInsertOneOptions) {
    const col = await this.handle;
    const result = await col.insertOne(doc, options);
    return result.ops[0];
  }

  async insertMany(
    docs: Array<OptionalId<T>>,
    options?: CollectionInsertManyOptions
  ) {
    const col = await this.handle;
    const result = await col.insertMany(docs, options);
    return result.ops;
  }
}
