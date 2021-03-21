import { parse, SelectArgument } from ".";

// This function serves as a template literal tag to build selectors :

export function select(
  chunks: TemplateStringsArray,
  ...args: Array<SelectArgument>
) {
  const symTable = new Map<string, SelectArgument>();
  const raw = chunks.reduce((acc, chunk, index) => {
    const symbol = `@${index}`;
    symTable.set(symbol, args[index - 1]);
    return `${acc} ${symbol} ${chunk}`;
  });
  return parse(raw, symTable);
}
