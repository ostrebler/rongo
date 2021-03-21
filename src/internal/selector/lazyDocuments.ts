import { isEmpty } from "lodash";
import { Collection, Document, FilterQuery } from "../../.";

// This class is used as an abstraction layer between foreign documents and selectors, in order to allow for
// actual MongoDB filter query selections, thus avoiding bad over-fetching patterns

export class LazyDocuments<T extends Document> {
  private readonly collection: Collection<T>;
  private readonly queries: Array<FilterQuery<T>>;

  constructor(collection: Collection<T>, queries: Array<FilterQuery<T>>) {
    this.collection = collection;
    this.queries = queries;
  }

  get query() {
    const query: FilterQuery<T> = {};
    if (!isEmpty(this.queries)) query.$and = this.queries;
    return query;
  }

  extend(query: FilterQuery<T>) {
    return new LazyDocuments(this.collection, [...this.queries, query]);
  }

  fetch() {
    return this.collection.find(this.query);
  }

  fetchOne(index: number) {
    return this.collection
      .find(this.query, { skip: index, limit: 1 })
      .then(([item]) => item as T | undefined);
  }
}
