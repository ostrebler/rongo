import { ObjectId } from "mongodb";
import { assign, isString } from "lodash";
import { extname } from "path";
import { readFileSync } from "fs";
import YAML from "yaml";
import {
  Collection,
  CollectionConfig,
  Document,
  parseSelector,
  select,
  Selectable,
  SelectablePromise,
  SelectArgument,
  SelectionOption,
  Selector,
  Stack
} from "../.";

// ObjectId is being reexported for practicality

export { ObjectId };

// This function creates a default collection config

export function createDefaultConfig(): CollectionConfig {
  return {
    key: "_id",
    foreignKeys: Object.create(null),
    references: Object.create(null)
  };
}

// This function transforms a stack into an exploitable key

export function stackToKey(stack: Stack) {
  return stack.filter(key => isString(key) && !key.startsWith("$")).join(".");
}

// This function loads a schema from a file

export function loadSchema(fileName: string): unknown {
  const extension = extname(fileName);
  const content = readFileSync(fileName).toString();
  switch (extension.toLowerCase()) {
    case ".json":
      return JSON.parse(content);
    case ".yaml":
    case ".yml":
      return YAML.parse(content);
    default:
      throw new Error(`Unknown file extension <${extension}> for Rongo schema`);
  }
}

// This function is an async version of Array.prototype.filter

export function asyncFilter<T>(
  array: Array<T>,
  predicate: (
    item: T,
    index: number,
    array: Array<T>
  ) => boolean | Promise<boolean>
) {
  return array.reduce<Promise<Array<T>>>(
    async (acc, item, index) =>
      (await predicate(item, index, array)) ? [...(await acc), item] : acc,
    Promise.resolve([])
  );
}

// This function patches Promises to make them selectable

export function selectablePromise<T extends Document, S extends Selectable<T>>(
  collection: Collection<T>,
  promiseFactory: () => Promise<S>
): SelectablePromise<S> {
  const promise = promiseFactory();
  return assign(promise, {
    select(
      chunks: TemplateStringsArray | string | Selector,
      arg: SelectArgument | SelectionOption | undefined,
      ...args: Array<SelectArgument>
    ) {
      let selector: Selector;
      let options: SelectionOption | undefined;
      if (isString(chunks)) {
        selector = parseSelector(chunks);
        options = arg as SelectionOption | undefined;
      } else if (chunks instanceof Selector) {
        selector = chunks;
        options = arg as SelectionOption | undefined;
      } else
        selector =
          arg === undefined ? select(chunks) : select(chunks, arg, ...args);
      return promise.then(selectable =>
        collection.select(selector, selectable, options)
      );
    }
  });
}
