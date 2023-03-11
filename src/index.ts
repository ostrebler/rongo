import { Database } from "./database";
import { Collection } from "./collection";
import { DatabaseOptions, Plugin } from "./types";

function rongo<CollectionName extends string>(
  options: DatabaseOptions<CollectionName>
) {
  return Database.create(options);
}

rongo.extend = <Options>(plugin: Plugin<Options>, options?: Options) => {
  if (!plugin.applied) {
    plugin(rongo, Database, Collection, options);
    plugin.applied = true;
  }
  return rongo;
};

export { rongo };
export default rongo;

export * from "./database";
export * from "./collection";
export * from "./utility";
export * from "./types";
