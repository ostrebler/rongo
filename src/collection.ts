import {
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  DbCollectionOptions,
  MongoCountPreferences,
  OptionalId
} from "mongodb";
import { Database, FilterQuery } from ".";

export class Collection<T extends object> {
  name: string;
  handle: Promise<Col<T>>;

  constructor(
    database: Database,
    name: string,
    options: DbCollectionOptions = {}
  ) {
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
