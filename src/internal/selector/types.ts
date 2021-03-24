import { FilterQuery, Selector } from "../../.";

// Used by FilterSelector and SwitchSelector to filter array values and switch branches

export type SelectorPredicateCallback = (
  value: any,
  index: number, // Not present for SwitchSelector
  array: Array<any> // Not present for SwitchSelector
) => boolean | Promise<boolean>;

// The possible template literal arguments to the select builder :

export type SelectArgument =
  | string
  | number
  | Selector
  | FilterQuery<any>
  | SelectorPredicateCallback;

// The possible entries in the symbol table

export type SelectSymbolEntry = Exclude<SelectArgument, string | number>;
