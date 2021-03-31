import {
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CommonOptions,
  DbCollectionOptions,
  FindOneOptions,
  MongoCountPreferences,
  UpdateManyOptions,
  UpdateQuery,
  WithId
} from "mongodb";
import { isString } from "lodash";
import {
  createDefaultConfig,
  DeletedKeys,
  DependencyCollector,
  Document,
  FilterQuery,
  InsertionDoc,
  nestedInsert,
  normalizeFilterQuery,
  parseSelector,
  propagateRemove,
  RemoveScheduler,
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
    pipeline: Array<any> = [],
    options?: CollectionAggregationOptions
  ) {
    const col = await this.handle;
    const [first, ...stages] = pipeline;
    if (first?.$match)
      pipeline = [
        { $match: await normalizeFilterQuery(this, first.$match) },
        ...stages
      ];
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

  findByKey(key: any, options?: FindOneOptions<T extends T ? T : T>) {
    return this.findOne({ [this.primaryKey]: key } as FilterQuery<T>, options);
  }

  async has(query: FilterQuery<T> = {}) {
    return 0 < (await this.count(query, { limit: 1 }));
  }

  hasKey(key: any) {
    return this.has({ [this.primaryKey]: key } as FilterQuery<T>);
  }

  // Insert method :

  insert(
    doc: InsertionDoc<T>,
    options?: CollectionInsertManyOptions
  ): SelectablePromise<WithId<T>>;

  insert(
    docs: Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions
  ): SelectablePromise<Array<WithId<T>>>;

  insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions
  ): SelectablePromise<WithId<T> | Array<WithId<T>>>;

  insert(
    doc: InsertionDoc<T> | Array<InsertionDoc<T>>,
    options?: CollectionInsertManyOptions
  ) {
    const exec = async () => {
      const dependencies = new DependencyCollector(this.rongo);
      try {
        return nestedInsert(this, doc, options ?? {}, dependencies);
      } catch (e) {
        await dependencies.delete();
        throw e;
      }
    };
    return selectablePromise(this, exec());
  }

  // Update methods :

  async update(
    query: FilterQuery<T>,
    update: UpdateQuery<T> | Partial<T>,
    options?: UpdateManyOptions & { multi?: boolean }
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col[options?.multi ? "updateMany" : "updateOne"](
      normalized,
      update,
      options
    );
  }

  // Delete methods :

  async remove(
    query: FilterQuery<T> = {},
    options: CommonOptions & { single?: boolean }
  ) {
    const scheduler: RemoveScheduler = [];
    const deletedKeys: DeletedKeys = Object.create(null);
    const remover = await propagateRemove(
      this,
      query,
      options.single ?? false,
      scheduler,
      deletedKeys
    );
    for (const task of scheduler) await task();
    return remover();
  }
}
