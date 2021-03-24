import { isFunction, isPlainObject } from "lodash";
import {
  FieldSelector,
  FilterSelector,
  FlatMapSelector,
  IdentitySelector,
  IndexSelector,
  MapSelector,
  ObjectSelector,
  PredicateSelector,
  Selector,
  SelectSymbolEntry,
  ShortcutSelector,
  SwitchSelector,
  TupleSelector
} from ".";

// This is the grammar of Selectors :
//
// selector:
// | <>                                              { IdentitySelector }
// | <field> selector                                { FieldSelector(field, arg, selector) }
// | <index> selector                                { IndexSelector(index, selector) }
// | <>> selector                                    { ShortcutSelector(selector) }
// | <$> selector                                    { MapSelector(selector) }
// | <$$> selector                                   { FlatMapSelector(selector) }
// | <arg as selector>                               { arg }
// | <arg as function> selector                      { PredicateSelector(arg, selector) }
// | <arg as function> <?> selector (<:> selector)?  { SwitchSelector(arg, selector, selector) }
// | <arg as object> selector                        { FilterSelector(arg, selector) }
// | <[> selector (<,> selector)* <]>                { TupleSelector(...[selector]) }
// | <{>
//     ((<field>|<*>) selector)
//     (<,> (<field>|<*>) selector)*
//   <}>                                             { ObjectSelector(...[field, selector]) }
//
// spacing:
// | <[.\s]+>

// This function is used to transform a string to a valid Selector

export function parseSelector(
  raw: string,
  symTable: Map<string, SelectSymbolEntry> = new Map()
) {
  const spacePattern = /(\s|\.)*/y;
  const fieldPattern = /[a-zA-Z_-][a-zA-Z0-9_-]*/y;
  const indexPattern = /[0-9]+/y;
  const symbolPattern = /@[0-9]+/y;

  // The function corresponds to the single rule in the grammar :
  const expr = (index: { value: number }): Selector => {
    // Used to match a prefix based on a string :
    const match = (prefix: string) => {
      const result = raw.startsWith(prefix, index.value);
      if (result) index.value += prefix.length;
      return result ? [prefix] : null;
    };
    // Used to match a prefix based on a pattern :
    const matchPattern = (pattern: RegExp) => {
      pattern.lastIndex = index.value;
      const result = pattern.exec(raw);
      if (result) index.value = pattern.lastIndex;
      return result;
    };
    // Used to shortcut parsing and signal an fatal error :
    const fail = (message: string) => {
      throw new Error(
        `Selector parsing error at position ${index.value} : ${message}`
      );
    };

    matchPattern(spacePattern);

    let result: Array<string> | null;
    // If we have a field selector :
    if ((result = matchPattern(fieldPattern)))
      return new FieldSelector(result[0], expr(index));

    // If we have an index selector :
    if ((result = matchPattern(indexPattern)))
      return new IndexSelector(Number(result[0]), expr(index));

    // If we have a shortcut selector :
    if (match(">")) return new ShortcutSelector(expr(index));

    // If we have a flat-map or map selector :
    if (match("$$")) return new FlatMapSelector(expr(index));
    if (match("$")) return new MapSelector(expr(index));

    // If we see a symbol, then it's either...
    if ((result = matchPattern(symbolPattern))) {
      const argument = symTable.get(result[0]);
      // ...a nested selector :
      if (argument instanceof Selector) return argument;
      // ...a predicate selector or switch selector :
      if (isFunction(argument)) {
        matchPattern(spacePattern);
        if (!match("?")) return new PredicateSelector(argument, expr(index));
        const ifSelector = expr(index);
        matchPattern(spacePattern);
        return new SwitchSelector(
          argument,
          ifSelector,
          match(":") ? expr(index) : new IdentitySelector()
        );
      }
      // ...or a filter selector :
      if (isPlainObject(argument))
        return new FilterSelector(argument!, expr(index));
      throw new Error(
        `Invalid template argument <${result[0]}> in selector string`
      );
    }

    // If we have a tuple selector :
    if (match("[")) {
      const selectors: Array<Selector> = [];
      while (true) {
        selectors.push(expr(index));
        matchPattern(spacePattern);
        if (match(",")) continue;
        if (match("]")) return new TupleSelector(selectors);
        return fail(
          `Unexpected character <${raw[index.value]}>, expected <,> or <]>`
        );
      }
    }

    // If we have an object selector :
    if (match("{")) {
      const selectors = new Map<string, Selector>();
      while (true) {
        matchPattern(spacePattern);
        if (!((result = matchPattern(fieldPattern)) || (result = match("*"))))
          return fail(
            "Object subselections must start with a field or wildcard selector"
          );
        selectors.set(result[0], expr(index));
        matchPattern(spacePattern);
        if (match(",")) continue;
        if (match("}")) return new ObjectSelector(selectors);
        return fail(
          `Unexpected character <${raw[index.value]}>, expected <,> or <}>`
        );
      }
    }

    // If nothing matched, then it's an identity selector :
    return new IdentitySelector();
  };

  // Parse as much as possible from the start :
  const index = { value: 0 };
  const selector = expr(index);
  // Move past a spacing chunk :
  spacePattern.lastIndex = index.value;
  spacePattern.exec(raw);
  // If we're still not at the end of "raw", then there's some invalid suffix :
  if (spacePattern.lastIndex !== raw.length)
    throw new Error(
      "Incomplete selector parsing, please refer to the syntax specification in the doc"
    );
  return selector;
}
