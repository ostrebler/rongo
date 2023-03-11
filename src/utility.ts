export function error(message: string, path: string[] = []) {
  throw new Error(`${["Rongo", ...path].join(" > ")}: ${message}`);
}
