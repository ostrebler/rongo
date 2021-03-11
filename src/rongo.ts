import { DbCollectionOptions } from "mongodb";
import { Database, Schema } from ".";

// A handy wrapper around Database

export function rongo<T extends object>(
  collection: string,
  options: DbCollectionOptions = {}
) {
  return rongo._database.collection<T>(collection, options);
}

rongo._database = new Database();

rongo.connect = (url: string, name: string) => {
  return rongo._database.connect(url, name);
};

rongo.schema = (schema: Schema) => {
  rongo._database.schema(schema);
};

rongo.drop = () => {
  return rongo._database.drop();
};
