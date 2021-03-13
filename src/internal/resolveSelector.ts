import { Collection, Document, stackToKey, stringToSelector } from "../.";
import { flatten, isArray, isFunction, isObject } from "lodash";

export type Selector = Array<string | number | SelectorPredicate>;

export type SelectorPredicate = (
  item: any,
  index: number,
  array: Array<any>
) => boolean;

// This function is used to resolve a route selector by automatically walking through the data relations

export function resolveSelector<T extends Document>(
  collection: Collection<T>,
  document: undefined | null | T | Array<T>,
  selector: string | Selector
) {
  const reducer = async (
    value: any,
    selector: Selector,
    stack: Array<string | number> = []
  ): Promise<any> => {
    // If we arrived at a foreign key (or array of)
    const key = stackToKey(stack);
    if (key in collection.foreignKeys) {
      let doc: null | Document | Array<Document>;
      const foreignCol = collection.database.collection(
        collection.foreignKeys[key].collection
      );
      // We fetch the foreign document(s) :
      if (isArray(value))
        doc = await foreignCol.find({
          [foreignCol.primaryKey]: { $in: value }
        });
      else
        doc = await foreignCol.findOne({
          [foreignCol.primaryKey]: value
        });
      // And recursively resolve from there :
      return foreignCol.resolve(doc, selector);
    }

    // Otherwise, we keep navigating inside "value"
    const [route, ...rest] = selector;
    // If there's no more route to go down, return the final value :
    if (route === undefined) return value;
    // If there's a dollar-ish route, map values further down from there :
    if (route === "$" || route === "$$") {
      if (!isArray(value))
        throw new Error(`Can't resolve selector <${route}> in non-array value`);
      const values = await Promise.all(
        value.map((item, index) => reducer(item, rest, [...stack, index]))
      );
      return route === "$" ? values : flatten(values);
    }
    // If there's a predicate, map values further down after filtering them :
    if (isFunction(route)) {
      if (!isArray(value))
        throw new Error("Can't resolve predicate selector in non-array value");
      return Promise.all(
        value
          .filter(route)
          .map((item, index) => reducer(item, rest, [...stack, index]))
      );
    }
    // Otherwise, we keep going down with value[route], thus value needs to be an Object with such a property :
    if (!isObject(value))
      throw new Error(
        `Can't resolve selector <${route}> in primitive value <${value}>`
      );
    if (!value.hasOwnProperty(route))
      throw new Error(
        `Can't resolve selector <${route}> in non-primitive value`
      );
    return reducer((value as any)[route], rest, [...stack, route]);
  };

  return reducer(
    document,
    isArray(selector) ? selector : stringToSelector(selector)
  );
}

// This function enables the creation of selectors using tagged template literals

export function select(
  fragments: TemplateStringsArray,
  ...args: Array<string | number | SelectorPredicate>
) {
  return fragments.reduce<Selector>(
    (selector, fragment, index) => [
      ...selector,
      ...stringToSelector(fragment),
      ...(index !== fragments.length - 1 ? [args[index]] : [])
    ],
    []
  );
}
