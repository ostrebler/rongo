import { isNumber, isString } from "lodash";
import { parseSelector, SelectArgument, SelectSymbolEntry } from ".";

// This function serves as a template literal tag to build selectors :

export function select(
  chunks: TemplateStringsArray,
  ...args: Array<SelectArgument>
) {
  const symTable = new Map<string, SelectSymbolEntry>();
  const raw = chunks.reduce((acc, chunk, index) => {
    const arg = args[index - 1];
    // If the argument is a number or a string, it is directly patched :
    if (isNumber(arg) || isString(arg)) return `${acc} ${arg} ${chunk}`;
    // Otherwise, a new symbol is created for that argument, added to the symbol table and patched :
    const symbol = `@${index}`;
    symTable.set(symbol, arg);
    return `${acc} ${symbol} ${chunk}`;
  });
  return parseSelector(raw, symTable);
}
