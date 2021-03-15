import { entries, fromPairs, isArray, isPlainObject } from "lodash";
import { Stack } from "../.";

// This function is used to traverse and clone/transform augmented Mongo operators
// (query, update, projection, etc.) and insertion documents

export type Customizer = (value: any, stack: Stack, parent: any) => any;

export async function mapDeep(
  value: object,
  customizer: Customizer,
  stack: Stack = [],
  parent: any = undefined
): Promise<any> {
  // If this iteration gets a custom value, return it
  const result = await customizer(value, stack, parent);
  if (result !== undefined) return result;
  // If the current value is an array, it simply gets mapped with recursive calls
  if (isArray(value))
    return Promise.all(
      value.map((item, index) =>
        mapDeep(item, customizer, [...stack, index], value)
      )
    );
  // If the current value is a plain object, its values get mapped with recursive calls
  else if (isPlainObject(value))
    return fromPairs(
      await Promise.all(
        entries(value).map(
          async ([key, value]): Promise<[string, any]> => [
            key,
            await mapDeep(value, customizer, [...stack, key], value)
          ]
        )
      )
    );
  // Otherwise it's a primitive or other entity we don't need to traverse :
  return value;
}
