import { Code, ObjectId } from "mongodb";
import {
  BsonAny,
  BsonArray,
  BsonBinData,
  BsonBool,
  BsonDate,
  BsonEnum,
  BsonIntersection,
  BsonJavascript,
  BsonNull,
  BsonNumber,
  BsonObject,
  BsonObjectId,
  BsonOptional,
  BsonRecord,
  BsonReference,
  BsonRegex,
  BsonString,
  BsonTimestamp,
  BsonUnion
} from ".";

// Types

export type JsonSchema = Record<string, any>;

export type Infer<
  BsonType extends BsonAny,
  Cols extends Record<string, object>
> = BsonType extends BsonObjectId
  ? ObjectId
  : BsonType extends BsonNull
  ? null
  : BsonType extends BsonBool
  ? boolean
  : BsonType extends BsonDate
  ? Date
  : BsonType extends BsonRegex
  ? RegExp
  : BsonType extends BsonTimestamp
  ? Date
  : BsonType extends BsonJavascript
  ? Code
  : BsonType extends BsonBinData
  ? Buffer
  : BsonType extends BsonNumber
  ? number
  : BsonType extends BsonString
  ? string
  : BsonType extends BsonObject<infer F>
  ? InferBsonObject<F, Cols>
  : BsonType extends BsonRecord<infer T>
  ? Record<string, Infer<T, Cols>>
  : BsonType extends BsonArray<infer T>
  ? Infer<T, Cols>[]
  : BsonType extends BsonEnum<infer T>
  ? T[number]
  : BsonType extends BsonReference<infer T>
  ? InferBsonReference<T, Cols>
  : BsonType extends BsonOptional<infer T>
  ? Infer<T, Cols> | undefined
  : BsonType extends BsonUnion<infer T>
  ? InferBsonUnion<T, Cols>
  : BsonType extends BsonIntersection<infer T>
  ? InferBsonIntersection<T, Cols>
  : unknown;

export type InferBsonUnion<
  T extends BsonAny[],
  Cols extends Record<string, object>
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ? Infer<B, Cols> | InferBsonUnion<R, Cols>
  : never;

export type InferBsonIntersection<
  T extends BsonAny[],
  Cols extends Record<string, object>
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ? Infer<B, Cols> & InferBsonIntersection<R, Cols>
  : unknown;

export type InferBsonReference<
  T extends string,
  Cols extends Record<string, object>
> = ObjectId | (T extends keyof Cols ? Cols[T] : never);

export type InferBsonObject<
  F extends Record<string, BsonAny>,
  Cols extends Record<string, object>
> = AddQuestionMarks<{
  [K in keyof F]: Infer<F[K], Cols>;
}>;

export type AddQuestionMarks<
  T extends object,
  D extends keyof T = DefinedKeys<T>
> = SelfMapped<Pick<T, D> & Partial<Omit<T, D>>>;

export type DefinedKeys<F extends object> = {
  [K in keyof F]: undefined extends F[K] ? never : K;
}[keyof F];

export type SelfMapped<T extends object> = {
  [K in keyof T]: T[K];
};

// Constants

export const emailRegex =
  /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\])|(\[IPv6:(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))\])|([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])*(\.[A-Za-z]{2,})+))$/;

export const uuidRegex =
  /^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-5][a-fA-F0-9]{3}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}|00000000-0000-0000-0000-000000000000)$/;

export const isoDateRegex =
  /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{3})?(Z)?$/;

export const urlRegex =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

export const ipRegex =
  /^((((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))|((([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))))$/;

export const ipv4Regex =
  /^(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))$/;

export const ipv6Regex =
  /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
