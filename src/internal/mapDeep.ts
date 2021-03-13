import { entries, fromPairs, isArray, isPlainObject } from "lodash";

// This function is used to traverse and clone/transform augmented Mongo operators
// (query, update, projection, etc.) and insertion documents

export type Customizer = (
  value: any,
  stack: Array<string | number>,
  parent: any
) => any;

export async function mapDeep(
  operator: object,
  customizer: Customizer,
  stack: Array<string | number> = [],
  parent: any = undefined
): Promise<any> {
  // If this iteration gets a custom value, return it
  const result = await customizer(operator, stack, parent);
  if (result !== undefined) return result;
  // If the current value is an array, it simply gets mapped with recursive calls
  if (isArray(operator))
    return Promise.all(
      operator.map((item, index) =>
        mapDeep(item, customizer, [...stack, index], operator)
      )
    );
  // If the current value is a plain object, its values get mapped with recursive calls
  else if (isPlainObject(operator))
    return fromPairs(
      await Promise.all(
        entries(operator).map(
          async ([key, value]): Promise<[string, any]> => [
            key,
            await mapDeep(value, customizer, [...stack, key], operator)
          ]
        )
      )
    );
  // Otherwise it's a primitive or other entity we don't need to traverse :
  return operator;
}
