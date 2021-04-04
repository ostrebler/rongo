import {
  ChangeStreamOptions,
  ClientSession,
  Collection as Col,
  CollectionAggregationOptions,
  CollectionInsertManyOptions,
  CommonOptions,
  DbCollectionOptions,
  FindOneAndDeleteOption,
  FindOneAndReplaceOption,
  FindOneAndUpdateOption,
  FindOneOptions,
  GeoHaystackSearchOptions,
  IndexOptions,
  IndexSpecification,
  MongoCountPreferences,
  MongoDistinctPreferences,
  ReadPreferenceOrMode,
  ReplaceOneOptions,
  UpdateManyOptions,
  UpdateQuery,
  WithId
} from "mongodb";
import { entries, isArray, isString, keys } from "lodash";
import {
  createDefaultConfig,
  DeletedKeys,
  DependencyCollector,
  Document,
  FilterQuery,
  InsertionDoc,
  insertNested,
  normalizeFilterQuery,
  normalizeInsertionDoc,
  parseSelector,
  propagateRemove,
  References,
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

  get key() {
    return this.rongo.graph[this.name].key;
  }

  get foreignKeys() {
    return this.rongo.graph[this.name].foreignKeys;
  }

  get references() {
    return this.rongo.graph[this.name].references;
  }

  // Query methods :

  resolve(selector: string | Selector, selectable: Selectable<T>) {
    if (isString(selector)) selector = parseSelector(selector);
    return selector.resolve(selectable, this, []);
  }

  async aggregate<U = T>(
    pipeline: Array<any> = [],
    options?: CollectionAggregationOptions & { baseQuery?: boolean }
  ) {
    const col = await this.handle;
    const [first, ...stages] = pipeline;
    if (first?.$match && !options?.baseQuery)
      pipeline = [
        { $match: await normalizeFilterQuery(this, first.$match) },
        ...stages
      ];
    return col.aggregate<U>(pipeline, options).toArray();
  }

  async count(
    query: FilterQuery<T> = {},
    options?: MongoCountPreferences & { baseQuery?: boolean }
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query, options);
    return col.countDocuments(normalized, options);
  }

  async distinct(
    key: string,
    query: FilterQuery<T> = {},
    options?: MongoDistinctPreferences & { baseQuery?: boolean }
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query, options);
    return col.distinct(key, normalized, options);
  }

  find(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<T> & { baseQuery?: boolean }
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query, options);
      return col.find(normalized, options as any).toArray();
    });
  }

  findOne(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<T extends T ? T : T> & { baseQuery?: boolean }
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query, options);
      return col.findOne(normalized, options);
    });
  }

  findByKey(key: any, options?: FindOneOptions<T extends T ? T : T>) {
    return this.findOne({ [this.key]: key } as FilterQuery<T>, {
      ...options,
      baseQuery: true
    });
  }

  async findReferences(
    key: any | Array<any>,
    options?: { keysOnly?: boolean }
  ) {
    key = isArray(key) ? key : [key];
    const references: References = Object.create(null);
    for (const [colName, foreignKeys] of entries(this.references)) {
      const refCol = this.rongo.collection(colName);
      for (const foreignKey of keys(foreignKeys)) {
        const promise = refCol.find(
          { [foreignKey]: { $in: key } },
          { baseQuery: true }
        );
        references[colName] = await (options?.keysOnly
          ? promise
          : promise.select(refCol.key));
      }
    }
    return references;
  }

  async geoHaystackSearch(
    x: number,
    y: number,
    options?: GeoHaystackSearchOptions
  ) {
    const col = await this.handle;
    return col.geoHaystackSearch(x, y, options);
  }

  async has(query: FilterQuery<T> = {}, options?: { baseQuery?: boolean }) {
    return Boolean(await this.count(query, { ...options, limit: 1 }));
  }

  hasKey(key: any) {
    return this.has({ [this.key]: key } as FilterQuery<T>, { baseQuery: true });
  }

  async isCapped(options?: { session: ClientSession }) {
    const col = await this.handle;
    return col.isCapped(options);
  }

  async stats(options?: { scale: number; session?: ClientSession }) {
    const col = await this.handle;
    return col.stats(options);
  }

  async watch<U = T>(
    pipeline?: object[],
    options?: ChangeStreamOptions & { session?: ClientSession }
  ) {
    const col = await this.handle;
    return col.watch<U>(pipeline, options);
  }

  // Insert/replace methods :

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
    return selectablePromise(this, async () => {
      const dependencies = new DependencyCollector(this.rongo);
      try {
        return insertNested(this, doc, options, dependencies);
      } catch (e) {
        await dependencies.delete();
        throw e;
      }
    });
  }

  findOneAndReplace(
    query: FilterQuery<T>,
    doc: InsertionDoc<T>,
    options?: FindOneAndReplaceOption<T> & { baseQuery?: boolean }
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalizedQuery = await normalizeFilterQuery(this, query, options);
      const dependencies = new DependencyCollector(this.rongo);
      try {
        const normalizedDoc = await normalizeInsertionDoc(
          this,
          doc,
          dependencies
        );
        const result = await col.findOneAndReplace(
          normalizedQuery,
          normalizedDoc,
          options
        );
        return result.value ?? null;
      } catch (e) {
        await dependencies.delete();
        throw e;
      }
    });
  }

  findByKeyAndReplace(
    key: any,
    doc: InsertionDoc<T>,
    options?: FindOneAndReplaceOption<T>
  ) {
    return this.findOneAndReplace({ [this.key]: key } as FilterQuery<T>, doc, {
      ...options,
      baseQuery: true
    });
  }

  async replaceOne(
    query: FilterQuery<T>,
    doc: InsertionDoc<T>,
    options?: ReplaceOneOptions & { baseQuery?: boolean }
  ) {
    const col = await this.handle;
    const normalizedQuery = await normalizeFilterQuery(this, query, options);
    const dependencies = new DependencyCollector(this.rongo);
    try {
      const normalizedDoc = await normalizeInsertionDoc(
        this,
        doc,
        dependencies
      );
      return col.replaceOne(normalizedQuery, normalizedDoc as T, options);
    } catch (e) {
      await dependencies.delete();
      throw e;
    }
  }

  // Update methods :

  async update(
    query: FilterQuery<T>,
    update: UpdateQuery<T> | Partial<T>,
    options?: UpdateManyOptions & { multi?: boolean; baseQuery?: boolean }
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query, options);
    return col[options?.multi ? "updateMany" : "updateOne"](
      normalized,
      update,
      options
    );
  }

  findOneAndUpdate(
    query: FilterQuery<T>,
    update: UpdateQuery<T> | T,
    options?: FindOneAndUpdateOption<T> & { baseQuery?: boolean }
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query, options);
      const result = await col.findOneAndUpdate(normalized, update, options);
      return result.value ?? null;
    });
  }

  findByKeyAndUpdate(
    key: any,
    update: UpdateQuery<T> | T,
    options?: FindOneAndUpdateOption<T>
  ) {
    return this.findOneAndUpdate(
      { [this.key]: key } as FilterQuery<T>,
      update,
      { ...options, baseQuery: true }
    );
  }

  // Delete methods :

  async remove(
    query: FilterQuery<T> = {},
    options?: CommonOptions & { single?: boolean; baseQuery?: boolean }
  ) {
    const normalized = await normalizeFilterQuery(this, query, options);
    const scheduler: RemoveScheduler = [];
    const deletedKeys: DeletedKeys = Object.create(null);
    const remover = await propagateRemove(
      this,
      normalized,
      options?.single ?? false,
      options,
      scheduler,
      deletedKeys
    );
    for (const task of scheduler) await task();
    return remover();
  }

  async drop(options?: { session: ClientSession }) {
    const col = await this.handle;
    await this.remove({}, { ...options, baseQuery: true });
    return col.drop();
  }

  findOneAndDelete(
    query: FilterQuery<T>,
    options?: FindOneAndDeleteOption<T> & { baseQuery?: boolean }
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query, options);
      const result = await col.findOneAndDelete(normalized, options);
      return result.value ?? null;
    });
  }

  findByKeyAndDelete(key: any, options?: FindOneAndDeleteOption<T>) {
    return this.findOneAndDelete({ [this.key]: key } as FilterQuery<T>, {
      ...options,
      baseQuery: true
    });
  }

  // Index methods :

  async createIndex(fieldOrSpec: string | any, options?: IndexOptions) {
    const col = await this.handle;
    return col.createIndex(fieldOrSpec, options);
  }

  async createIndexes(
    indexSpecs: IndexSpecification[],
    options?: { session?: ClientSession }
  ) {
    const col = await this.handle;
    return col.createIndexes(indexSpecs, options);
  }

  async dropIndex(
    indexName: string,
    options?: CommonOptions & { maxTimeMS?: number }
  ) {
    const col = await this.handle;
    return col.dropIndex(indexName, options);
  }

  async dropIndexes(options?: { session?: ClientSession; maxTimeMS?: number }) {
    const col = await this.handle;
    return col.dropIndexes(options);
  }

  async indexes(options?: { session: ClientSession }) {
    const col = await this.handle;
    return col.indexes(options);
  }

  async indexExists(
    indexes: string | string[],
    options?: { session: ClientSession }
  ) {
    const col = await this.handle;
    return col.indexExists(indexes, options);
  }

  async indexInformation(options?: { full: boolean; session: ClientSession }) {
    const col = await this.handle;
    return col.indexInformation(options);
  }

  async listIndexes(options?: {
    batchSize?: number;
    readPreference?: ReadPreferenceOrMode;
    session?: ClientSession;
  }) {
    const col = await this.handle;
    return col.listIndexes(options).toArray();
  }

  async reIndex(options?: { session: ClientSession }) {
    const col = await this.handle;
    return col.reIndex(options);
  }
}
