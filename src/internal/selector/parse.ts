import { SelectArgument, Selector } from ".";

export declare function parse(
  raw: string,
  symtable?: Map<string, SelectArgument>
): Selector;
