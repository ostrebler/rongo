import { entries, isArray } from "lodash";
import { Collection, Rongo } from "../.";

// This class is used to collect document references across the database (used for nested inserts clean-ups)

export class DependencyCollector {
  private readonly rongo: Rongo;
  private dependencies: {
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
