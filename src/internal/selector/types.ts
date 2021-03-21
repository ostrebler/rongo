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

// Used to label a specific token in order to be consumed by the parser :

export enum SelectorTokenType {
  Field,
  Wildcard,
  Index,
  Comma,
  MapOperator,
  FlatMapOperator,
  SelectArgument,
  BracketOpen,
  BracketClose,
  SquareBracketOpen,
  SquareBracketClose
}

// Use as a yield value by the token generator :

export type SelectorToken =
  | {
      type: SelectorTokenType.Field;
      field: string;
    }
  | {
      type: SelectorTokenType.Index;
      index: number;
    }
  | {
      type: SelectorTokenType.SelectArgument;
      argument: SelectArgument;
    }
  | {
      type: Exclude<
        SelectorTokenType,
        | SelectorTokenType.Field
        | SelectorTokenType.Index
        | SelectorTokenType.SelectArgument
      >;
    };
