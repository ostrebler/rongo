import { FilterQuery, Selector } from "../../.";

// Used by the PredicateSelector to filter array values

export type PredicateSelectorCallback = (
  item: any,
  index: number,
  array: Array<any>
) => boolean | Promise<boolean>;

// The possible template literal arguments to the select builder :

export type SelectArgument =
  | string
  | number
  | Selector
  | FilterQuery<any>
  | PredicateSelectorCallback;
