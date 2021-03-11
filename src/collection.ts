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
import { map } from "lodash";
import { Database, FilterQuery } from ".";

export class Collection<T extends object> {
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
  }

  aggregate<U = T>(
    pipeline?: object[],
    options?: CollectionAggregationOptions
  ) {
    return this.handle.then(col =>
      col.aggregate<U>(pipeline, options).toArray()
    );
  }

  // Query methods :

  find<U = T>(
    query: FilterQuery<T>,
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    return this.handle.then(col => col.find(query, options ?? {}).toArray());
  }

  findMap<U = T>(
    query: FilterQuery<T>,
    key: keyof U,
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    return this.find(query, {
      ...options,
      fields: { [key]: 1 } as any
    }).then(array => map(array, key));
  }

  count(query?: FilterQuery<T>, options?: MongoCountPreferences) {
    return this.handle.then(col => col.countDocuments(query, options));
  }

  // Insert methods :

  insertOne(doc: OptionalId<T>, options?: CollectionInsertOneOptions) {
    return this.handle
      .then(col => col.insertOne(doc, options))
      .then(({ ops }) => ops[0]);
  }

  insertMany(
    docs: Array<OptionalId<T>>,
    options?: CollectionInsertManyOptions
  ) {
    return this.handle
      .then(col => col.insertMany(docs, options))
      .then(({ ops }) => ops);
  }
}
