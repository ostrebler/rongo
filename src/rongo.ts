import { DbCollectionOptions } from "mongodb";
import { Database, DocumentT, Schema } from ".";

// A handy wrapper around Database

export function createRongo() {
  const database = new Database();

  function rongo<T extends DocumentT>(
    collection: string,
    options: DbCollectionOptions = {}
  ) {
    return database.collection<T>(collection, options);
  }

  rongo.connect = (url: string, name: string) => {
    return database.connect(url, name);
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
