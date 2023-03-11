import { Collection as MongoCollection, Document } from "mongodb";
import { isArray } from "lodash-es";
import { Database, SchemaLevel } from ".";

export class Collection<T extends Document = Document> {
  database: Database;
  collection: MongoCollection<T>;
  _ready: Promise<void>;

  static create<T extends Document>(database: Database, name: string) {
    return new Collection<T>(database, name);
  }

  private constructor(database: Database, name: string) {
    this.database = database;
    this.collection = database.db.collection<T>(
      name,
      database.options.collections[name].collectionOptions
    );
    this._ready = this._prepare();
  }

  async _prepare() {
    await this._createIndex();
    await this._enforceSchema();
  }

  async _createIndex() {
    let { indexes = [] } = this.options;
    indexes = isArray(indexes) ? indexes : [indexes];
    await this.collection.createIndexes(indexes.map(index => ({ key: index })));
  }

  async _enforceSchema() {
    const { schema, schemaLevel = SchemaLevel.Strict } = this.options;
    await this.database.command({
      collMod: this.name,
      validator: { $jsonSchema: schema },
      validationLevel: schemaLevel
    });
  }

  get options() {
    return this.database.options.collections[this.name];
  }

  get name() {
    return this.collection.collectionName;
  }
}
