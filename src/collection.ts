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
  normalizeInsertionDoc,
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

  async distinct(
    key: string,
    query: FilterQuery<T> = {},
    options?: MongoDistinctPreferences
  ) {
    const col = await this.handle;
    const normalized = await normalizeFilterQuery(this, query);
    return col.distinct(key, normalized, options);
  }

  find(query: FilterQuery<T> = {}, options?: FindOneOptions<T>) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
      return col.find(normalized, options as any).toArray();
    });
  }

  findOne(
    query: FilterQuery<T> = {},
    options?: FindOneOptions<T extends T ? T : T>
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
      return col.findOne(normalized, options);
    });
  }

  findByKey(key: any, options?: FindOneOptions<T extends T ? T : T>) {
    return this.findOne({ [this.key]: key } as FilterQuery<T>, options);
  }

  async geoHaystackSearch(
    x: number,
    y: number,
    options?: GeoHaystackSearchOptions
  ) {
    const col = await this.handle;
    return col.geoHaystackSearch(x, y, options);
  }

  async has(query: FilterQuery<T> = {}) {
    return Boolean(await this.count(query, { limit: 1 }));
  }

  hasKey(key: any) {
    return this.has({ [this.key]: key } as FilterQuery<T>);
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
        return nestedInsert(this, doc, options, dependencies);
      } catch (e) {
        await dependencies.delete();
        throw e;
      }
    });
  }

  findOneAndReplace(
    query: FilterQuery<T>,
    doc: InsertionDoc<T>,
    options?: FindOneAndReplaceOption<T>
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalizedQuery = await normalizeFilterQuery(this, query);
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
    return this.findOneAndReplace(
      { [this.key]: key } as FilterQuery<T>,
      doc,
      options
    );
  }

  async replaceOne(
    query: FilterQuery<T>,
    doc: InsertionDoc<T>,
    options?: ReplaceOneOptions
  ) {
    const col = await this.handle;
    const normalizedQuery = await normalizeFilterQuery(this, query);
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

  findOneAndUpdate(
    query: FilterQuery<T>,
    update: UpdateQuery<T> | T,
    options?: FindOneAndUpdateOption<T>
  ) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
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
      options
    );
  }

  // Delete methods :

  async remove(
    query: FilterQuery<T> = {},
    options?: CommonOptions & { single?: boolean }
  ) {
    const normalized = await normalizeFilterQuery(this, query);
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
    await this.remove({}, options);
    return col.drop();
  }

  findOneAndDelete(query: FilterQuery<T>, options?: FindOneAndDeleteOption<T>) {
    return selectablePromise(this, async () => {
      const col = await this.handle;
      const normalized = await normalizeFilterQuery(this, query);
      const result = await col.findOneAndDelete(normalized, options);
      return result.value ?? null;
    });
  }

  findByKeyAndDelete(key: any, options?: FindOneAndDeleteOption<T>) {
    return this.findOneAndDelete(
      { [this.key]: key } as FilterQuery<T>,
      options
    );
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
