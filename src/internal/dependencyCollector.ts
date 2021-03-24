import { entries, isArray } from "lodash";
import { Collection, Rongo } from "../.";

// This class is used to collect document references across the database (can be used for nested inserts error
// clean-ups, or cascade delete documents, etc.)

export class DependencyCollector {
  rongo: Rongo;
  dependencies: {
    [collection: string]: Array<any>;
  };

  constructor(rongo: Rongo) {
    this.rongo = rongo;
    this.dependencies = Object.create(null);
  }

  add(collection: Collection<any>, keys: any | Array<any>) {
    if (!(collection.name in this.dependencies))
      this.dependencies[collection.name] = [];
    this.dependencies[collection.name].push(...(isArray(keys) ? keys : [keys]));
  }

  async delete() {
    for (const [collectionName, keys] of entries(this.dependencies)) {
      const collection = this.rongo.collection(collectionName);
      await collection.deleteMany({ [collection.primaryKey]: { $in: keys } });
    }
    this.dependencies = Object.create(null);
  }
}
