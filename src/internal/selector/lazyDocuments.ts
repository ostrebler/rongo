import { Collection, FilterQuery } from "../../.";

// This class is used as an abstraction layer between foreign documents and selectors, in order to allow for
// actual MongoDB filter query selections, thus avoiding bad over-fetching patterns

export class LazyDocuments {
  private readonly collection: Collection<any>;
  private readonly queries: Array<FilterQuery<any>>;

  constructor(collection: Collection<any>, queries: Array<FilterQuery<any>>) {
    this.collection = collection;
    this.queries = queries;
  }

  extend(query: FilterQuery<any>) {
    return new LazyDocuments(this.collection, [...this.queries, query]);
  }

  fetch() {
    return this.collection.find({ $and: this.queries });
  }

  fetchOne(index: number) {
    return this.collection
      .find({ $and: this.queries }, { skip: index, limit: 1 })
      .then(([item]) => item);
  }
}
