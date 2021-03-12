import { DbCollectionOptions, MongoClientOptions } from "mongodb";
import { Database, Document, Schema } from ".";

// A handy wrapper around Database

export function createRongo() {
  const database = new Database();

  function rongo<T extends Document>(
    collection: string,
    options: DbCollectionOptions = {}
  ) {
    return database.collection<T>(collection, options);
  }

  rongo.connect = (url: string, name: string, options?: MongoClientOptions) => {
    return database.connect(url, name, options);
  };

  rongo.schema = (schema: Schema | string) => {
    database.schema(schema);
  };

  rongo.drop = () => {
    return database.drop();
  };

  return rongo;
}

export const rongo = createRongo();
