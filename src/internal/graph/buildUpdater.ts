import { isEmpty } from "lodash";
import { Path } from "../../.";

/* This function transforms a key path to a valid [$set-like update query target, array filter] pair
 *
 * a           => a                  | null
 * a.$         => a.$[f]             | f
 * a.b         => a.b                | null
 * a.b.c       => a.b.c              | null
 * a.$.b       => a.$[f].b           | f.b
 * a.$.b.$     => a.$[].b.$[f]       | f
 * a.$.b.c     => a.$[f].b.c         | f.b.c
 * a.$.b.$.c   => a.$[].b.$[f].c     | f.c
 * a.$.b.$.c.$ => a.$[].b.$[].c.$[f] | f
 * */

export function toSetUpdater(path: Path): [string, string | null] {
  const [target, filter] = [...path]
    .reverse()
    .reduce<[Array<string>, Array<string> | null]>(
      ([acc, filter], route) => {
        if (route !== "$") return [[route, ...acc], filter];
        if (filter) return [["$[]", ...acc], filter];
        return [
          ["$[f]", ...acc],
          ["f", ...acc]
        ];
      },
      [[], null]
    );
  return [target.join("."), filter && filter.join(".")];
}

/* This function transforms a key path to a valid [$pull-like update query target, element filter] pair
 *
 * a           => NEVER
 * a.$         => a              | null
 * a.b         => NEVER
 * a.b.c       => NEVER
 * a.$.b       => a              | b
 * a.$.b.$     => a.$[].b        | null
 * a.$.b.c     => a              | b.c
 * a.$.b.$.c   => a.$[].b        | c
 * a.$.b.$.c.$ => a.$[].b.$[].c  | null
 * */

export function toPullUpdater(path: Path): [string, string | null] {
  const [target, filter] = [...path]
    .reverse()
    .reduce<[Array<string>, Array<string>, boolean]>(
      ([acc, filter, hit], route) => {
        if (route !== "$")
          return hit
            ? [[route, ...acc], filter, hit]
            : [acc, [route, ...filter], hit];
        if (!hit) return [acc, filter, true];
        return [["$[]", ...acc], filter, hit];
      },
      [[], [], false]
    );
  return [target.join("."), isEmpty(filter) ? null : filter.join(".")];
}
