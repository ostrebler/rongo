import {
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  DbCollectionOptions,
  FindOneOptions,
  MongoCountPreferences,
  WithId
} from "mongodb";
import { isArray, isString } from "lodash";
import {
  createDefaultConfig,
  Document,
  FilterQuery,
  InsertDependency,
  InsertionDoc,
  normalizeFilterQuery,
  normalizeInsertionDoc,
  parseSelector,
  Rongo,
  select,
  SelectArgument,
  Selector
} from ".";

// The Collection class

export class Collection<T extends Document> {
  name: string;
  rongo: Rongo;
  handle: Promise<Col<T>>;

  constructor(rongo: Rongo, name: string, options: DbCollectionOptions = {}) {
    this.name = name;
    this.rongo = rongo;
    this.handle = rongo.handle.then(db => db.collection<T>(name, options));
    if (!(name in rongo.graph)) rongo.graph[name] = createDefaultConfig();
  }

  // Meta data :

  get primaryKey() {
    return this.rongo.graph[this.name].primaryKey;
  }

  get foreignKeys() {
    return this.rongo.graph[this.name].foreignKeys;
  }

  get references() {
    return this.rongo.graph[this.name].references;
  }

  // Query methods :

  select(chunks: TemplateStringsArray, ...args: Array<SelectArgument>) {
    return select(chunks, ...args).in(this);
  }

  resolve(
    document: undefined | null | T | Array<T>,
    selector: string | Selector // TODO: SelectArgument ?
  ) {
    if (isString(selector)) selector = parseSelector(selector);
    return selector.select(document, this, []);
  }

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
    return col.find<U>(normalized, options ?? {}).toArray();
  }

  async findOne<U = T>(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<U extends T ? T : U>
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col.findOne(normalized, options);
  }

  async findResolve<K extends keyof T>(
    query?: FilterQuery<T>,
    selector?: K,
    options?: FindOneOptions<T>
  ): Promise<Array<T[K]>>;

  async findResolve(
    query?: FilterQuery<T>,
    selector?: string | Selector,
    options?: FindOneOptions<T>
  ): Promise<any>;

  async findResolve(
    query: FilterQuery<T> = {},
    selector: string | Selector = this.primaryKey,
    options?: FindOneOptions<T extends T ? T : T>
  ) {
    const documents = await this.find(query, options);
    return this.resolve(documents, selector);
  }

  async findOneResolve<K extends keyof T>(
    query?: FilterQuery<T>,
    selector?: K,
    options?: FindOneOptions<T>
  ): Promise<T[K]>;

  async findOneResolve(
    query?: FilterQuery<T>,
    selector?: string | Selector,
    options?: FindOneOptions<T>
  ): Promise<any>;

  async findOneResolve(
    query: FilterQuery<T> = {},
    selector: string | Selector = this.primaryKey,
    options?: FindOneOptions<T extends T ? T : T>
  ) {
    const document = await this.findOne(query, options);
    return this.resolve(document, selector);
  }

  // Insert methods :

  async insert(
    doc: InsertionDoc<T>,
    options?: CollectionInsertOneOptions
  ): Promise<WithId<T>>;

  async insert(
    docs: Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions
  ): Promise<Array<WithId<T>>>;

  async insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ): Promise<WithId<T> | Array<WithId<T>>>;

  async insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertOneOptions | CollectionInsertManyOptions
  ) {
    const col = await this.handle;
    const dependencies = new InsertDependency(this.rongo);
    try {
      const normalized = await normalizeInsertionDoc(this, doc, dependencies);
      if (!isArray(normalized)) {
        const result = await col.insertOne(normalized, options);
        return result.ops[0];
      } else {
        const result = await col.insertMany(normalized, options);
        return result.ops;
      }
    } catch (e) {
      await dependencies.delete();
      throw e;
    }
  }

  // Delete methods :

  deleteMany(...args: Array<any>): any {}
}
