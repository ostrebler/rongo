// Used by the PredicateSelector to filter array values

export type PredicateSelectorCallback = (
  item: any,
  index: number,
  array: Array<any>
) => boolean | Promise<boolean>;
