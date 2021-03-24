import {
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CollectionInsertOneOptions,
  DbCollectionOptions,
  FindOneOptions,
  InsertOneWriteOpResult,
  InsertWriteOpResult,
  MongoCountPreferences,
  WithId
} from "mongodb";
import { isArray, isString } from "lodash";
import {
  CollectionSelector,
  createDefaultConfig,
  DependencyCollector,
  Document,
  FilterQuery,
  InsertionDoc,
  normalizeFilterQuery,
  normalizeInsertionDoc,
  parseSelector,
  Rongo,
  select,
  Selectable,
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

  select(selector: string | Selector): CollectionSelector<T>;

  select(selector: string | Selector, document: Selectable<T>): Promise<any>;

  select(
    chunks: TemplateStringsArray,
    ...args: Array<SelectArgument>
  ): CollectionSelector<T>;

  select(
    chunks: string | Selector | TemplateStringsArray,
    arg?: Selectable<T> | SelectArgument,
    ...args: Array<SelectArgument>
  ) {
    if (isString(chunks)) chunks = parseSelector(chunks);
    if (!(chunks instanceof Selector)) chunks = select(chunks, [arg, ...args]);
    else if (arg !== undefined) return chunks.apply(arg, this, []);
    const selector = chunks;
    const collectionSelector: CollectionSelector<T> = document =>
      selector.apply(document, this, []);
    collectionSelector.find = async (query, options) =>
      selector.apply(await this.find(query, options), this, []);
    collectionSelector.findOne = async (query, options) =>
      selector.apply(await this.findOne(query, options), this, []);
    return collectionSelector;
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

  // Insert methods :

  async insert(
    doc: InsertionDoc<T>,
    options?: CollectionInsertOneOptions,
    dependencies?: DependencyCollector
  ): Promise<WithId<T>>;

  async insert(
    docs: Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions,
    dependencies?: DependencyCollector
  ): Promise<Array<WithId<T>>>;

  async insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertOneOptions | CollectionInsertManyOptions,
    dependencies: DependencyCollector = new DependencyCollector(this.rongo)
  ) {
    try {
      const col = await this.handle;
      const normalized = await normalizeInsertionDoc(this, doc, dependencies);
      let result:
        | InsertOneWriteOpResult<WithId<T>>
        | InsertWriteOpResult<WithId<T>>;
      let documents: WithId<T> | Array<WithId<T>>;
      if (!isArray(normalized)) {
        result = await col.insertOne(normalized, options);
        documents = result.ops[0];
      } else {
        result = await col.insertMany(normalized, options);
        documents = result.ops;
      }
      dependencies.add(this, await this.select(this.primaryKey, documents));
      if (!result.result.ok)
        throw new Error(
          `Something went wrong in the MongoDB driver during insert in collection <${this.name}>`
        );
      return documents;
    } catch (e) {
      await dependencies.delete();
      throw e;
    }
  }

  // Delete methods :

  deleteMany(...args: Array<any>): any {}
}
