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
  createDefaultConfig,
  DependencyCollector,
  Document,
  FilterQuery,
  InsertionDoc,
  normalizeFilterQuery,
  normalizeInsertionDoc,
  parseSelector,
  Rongo,
  Selectable,
  SelectablePromise,
  selectablePromise,
  Selector
} from ".";

// The Collection class

export class Collection<T extends Document> {
  readonly name: string;
  readonly rongo: Rongo;
  readonly handle: Promise<Col<T>>;

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

  resolve(selector: string | Selector, document: Selectable<T>) {
    if (isString(selector)) selector = parseSelector(selector);
    return selector.resolve(document, this, []);
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

  find(query: FilterQuery<T> = {}, options?: FindOneOptions<T>) {
    const exec = async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
      return col.find(normalized, options as any).toArray();
    };
    return selectablePromise(this, exec());
  }

  findOne(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<T extends T ? T : T>
  ) {
    const exec = async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
      return col.findOne(normalized, options);
    };
    return selectablePromise(this, exec());
  }

  // Insert method :

  insert(
    doc: InsertionDoc<T>,
    options?: CollectionInsertOneOptions,
    dependencies?: DependencyCollector
  ): SelectablePromise<WithId<T>>;

  insert(
    docs: Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions,
    dependencies?: DependencyCollector
  ): SelectablePromise<Array<WithId<T>>>;

  insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertOneOptions | CollectionInsertManyOptions,
    dependencies?: DependencyCollector
  ): SelectablePromise<WithId<T> | Array<WithId<T>>>;

  insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertOneOptions | CollectionInsertManyOptions,
    dependencies: DependencyCollector = new DependencyCollector(this.rongo)
  ) {
    const exec = async () => {
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
        dependencies.add(this, await this.resolve(this.primaryKey, documents));
        if (!result.result.ok)
          throw new Error(
            `Something went wrong in the MongoDB driver during insert in collection <${this.name}>`
          );
        return documents;
      } catch (e) {
        await dependencies.delete();
        throw e;
      }
    };
    return selectablePromise(this, exec());
  }

  // Delete methods :

  deleteMany(...args: Array<any>): any {}
}
