import { BSONType } from "mongodb";
import { Binary } from "bson";

// Since MongoDB types are not interface, it was impossible to augment using module augmentation...
// So this is a patched copy-past.

type BSONTypeAlias =
  | "number"
  | "double"
  | "string"
  | "object"
  | "array"
  | "binData"
  | "undefined"
  | "objectId"
  | "bool"
  | "date"
  | "null"
  | "regex"
  | "dbPointer"
  | "javascript"
  | "symbol"
  | "javascriptWithScope"
  | "int"
  | "timestamp"
  | "long"
  | "decimal"
  | "minKey"
  | "maxKey";

type BitwiseQuery =
  | number /** <numeric bitmask> */
  | Binary /** <BinData bitmask> */
  | number[]; /** [ <position1>, <position2>, ... ] */

// we can search using alternative types in mongodb e.g.
// string types can be searched using a regex in mongo
// array types can be searched using their element type
type RegExpForString<T> = T extends string ? RegExp | T : T;
type MongoAltQuery<T> = T extends ReadonlyArray<infer U>
  ? T | RegExpForString<U>
  : RegExpForString<T>;

/** @see https://docs.mongodb.com/manual/reference/operator/query/#query-selectors */
export type QuerySelector<T> = {
  // Comparison
  $eq?: T;
  $gt?: T;
  $gte?: T;
  $in?: Array<T | FilterQuery<any>> | FilterQuery<any>; // PATCHED
  $lt?: T;
  $lte?: T;
  $ne?: T;
  $nin?: Array<T | FilterQuery<any>> | FilterQuery<any>; // PATCHED
  // Logical
  $not?: T extends string ? QuerySelector<T> | RegExp : QuerySelector<T>;
  // Element
  /**
   * When `true`, `$exists` matches the documents that contain the field,
   * including documents where the field value is null.
   */
  $exists?: boolean;
  $type?: BSONType | BSONTypeAlias;
  // Evaluation
  $expr?: any;
  $jsonSchema?: any;
  $mod?: T extends number ? [number, number] : never;
  $regex?: T extends string ? RegExp | string : never;
  $options?: T extends string ? string : never;
  // Geospatial
  $geoIntersects?: { $geometry: object };
  $geoWithin?: object;
  $near?: object;
  $nearSphere?: object;
  $maxDistance?: number;
  // Array
  $all?: T extends ReadonlyArray<infer U> ? any[] : never;
  $elemMatch?: T extends ReadonlyArray<infer U> ? object : never;
  $size?: T extends ReadonlyArray<infer U> ? number : never;
  // Bitwise
  $bitsAllClear?: BitwiseQuery;
  $bitsAllSet?: BitwiseQuery;
  $bitsAnyClear?: BitwiseQuery;
  $bitsAnySet?: BitwiseQuery;
};

export type RootQuerySelector<T> = {
  /** @see https://docs.mongodb.com/manual/reference/operator/query/and/#op._S_and */
  $and?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/nor/#op._S_nor */
  $nor?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/or/#op._S_or */
  $or?: Array<FilterQuery<T>>;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/text */
  $text?: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
  /** @see https://docs.mongodb.com/manual/reference/operator/query/where/#op._S_where */
  $where?: string | Function;
  /** @see https://docs.mongodb.com/manual/reference/operator/query/comment/#op._S_comment */
  $comment?: string;
  // we could not find a proper TypeScript generic to support nested queries e.g. 'user.friends.name'
  // this will mark all unrecognized properties as any (including nested queries)
  [key: string]: any;
};

export type Condition<T> = MongoAltQuery<T> | QuerySelector<MongoAltQuery<T>>;

export type FilterQuery<T> = {
  [P in keyof T]?: Condition<T[P]>;
} &
  RootQuerySelector<T>;
