import { entries } from "lodash";
import { Collection, Rongo } from "../.";

// This class is used to keep track of all the inserted foreign documents as part of an insert instruction

export class InsertDependency {
  rongo: Rongo;
  dependencies: {
    [collection: string]: Array<any>;
  };

  constructor(rongo: Rongo) {
    this.rongo = rongo;
    this.dependencies = Object.create(null);
  }

  add(collection: Collection<any>, key: any) {
    if (!(collection.name in this.dependencies))
      this.dependencies[collection.name] = [];
    this.dependencies[collection.name].push(key);
  }

  async delete() {
    for (const [collectionName, keys] of entries(this.dependencies)) {
      const collection = this.rongo.collection(collectionName);
      await collection.deleteMany({ [collection.primaryKey]: { $in: keys } });
    }
  }
}
