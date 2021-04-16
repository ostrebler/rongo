import { assign, isString } from "lodash";
import {
  Collection,
  Document,
  FindReferencesOptions,
  parseSelector,
  References,
  select,
  Selectable,
  SelectArgument,
  SelectionOption,
  Selector
} from "../.";

// Used as a contract for promises with advanced Rongo-specific methods

export type RichPromise<S extends Selectable<Document>> = Promise<S> & {
  select(selector: string | Selector, options?: SelectionOption): Promise<any>;
  select(
    chunks: TemplateStringsArray,
    ...args: Array<SelectArgument>
  ): Promise<any>;

  findReferences(options?: FindReferencesOptions): Promise<References>;
};

// Used to transform a promise into a rich promise

export function enrichPromise<T extends Document, S extends Selectable<T>>(
  collection: Collection<T>,
  promiseFactory: () => Promise<S>
) {
  const promise = promiseFactory();
  const richPromise: RichPromise<S> = assign(promise, {
    select(
      chunks: TemplateStringsArray | string | Selector,
      arg?: SelectArgument | SelectionOption | undefined,
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
        selector.resolve(selectable, collection, [], options)
      );
    },

    async findReferences(options?: FindReferencesOptions) {
      return collection.findReferences(
        await richPromise.select(collection.key),
        options
      );
    }
  });
  return richPromise;
}
