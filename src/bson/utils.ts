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
  BsonNot,
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
  BsonTuple,
  BsonUnion
} from ".";

export type JsonSchema = Record<string, any>;

// Document type inference from BSON schema

export type Infer<
  BsonType extends BsonAny,
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
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
  ? InferBsonObject<F, Cols, Path, Resolve>
  : BsonType extends BsonRecord<infer T>
  ? Record<string, Infer<T, Cols, JoinPath<Path, string>, Resolve>>
  : BsonType extends BsonArray<infer T>
  ? Infer<T, Cols, Path, Resolve>[]
  : BsonType extends BsonTuple<infer T, infer R>
  ? InferBsonTuple<T, R, Cols, Path, Resolve>
  : BsonType extends BsonEnum<infer T>
  ? T[number]
  : BsonType extends BsonReference<infer T>
  ? InferBsonReference<T, Cols, Path, Resolve>
  : BsonType extends BsonOptional<infer T>
  ? Infer<T, Cols, Path, Resolve> | undefined
  : BsonType extends BsonNot
  ? any // would require subtraction types (any ~ T)
  : BsonType extends BsonUnion<infer T>
  ? InferBsonUnion<T, Cols, Path, Resolve>
  : BsonType extends BsonIntersection<infer T>
  ? InferBsonIntersection<T, Cols, Path, Resolve>
  : unknown;

type InferBsonObject<
  F extends Record<string, BsonAny>,
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
> = AddQuestionMarks<{
  [K in keyof F & string]: Infer<F[K], Cols, JoinPath<Path, K>, Resolve>;
}>;

type InferBsonTuple<
  T extends BsonAny[],
  R extends BsonAny,
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer T2 extends BsonAny[]]
  ? [
      Infer<B, Cols, Path, Resolve>,
      ...InferBsonTuple<T2, R, Cols, Path, Resolve>
    ]
  : [R] extends [never]
  ? []
  : Infer<R, Cols, Path, Resolve>[];

type InferBsonReference<
  T extends string,
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
> = PathMatch<Path, Resolve> extends true
  ? T extends keyof Cols
    ? Infer<Cols[T], Cols, Path, Resolve>
    : never
  : ObjectId;

type InferBsonUnion<
  T extends BsonAny[],
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ? Infer<B, Cols, Path, Resolve> | InferBsonUnion<R, Cols, Path, Resolve>
  : never;

type InferBsonIntersection<
  T extends BsonAny[],
  Cols extends Record<string, BsonAny>,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ? Infer<B, Cols, Path, Resolve> &
      InferBsonIntersection<R, Cols, Path, Resolve>
  : unknown;

// Field type inference from BSON schema

export type InferField<Type, Path extends string> = Path extends ""
  ? Type
  : Type extends undefined
  ? undefined
  : Type extends null
  ? null
  : Type extends Array<infer T>
  ? Array<InferField<T, Path>>
  : Type extends Record<string, any>
  ? InferObjectField<Type, Path>
  : never;

export type InferObjectField<Type, Path extends string> = {
  [K in keyof Type & string]: Path extends K
    ? Type[K]
    : Path extends `${K}.${infer Rest}`
    ? InferField<Type[K], Rest>
    : never;
}[keyof Type & string];

// Utilities

type JoinPath<T extends string, U extends string> = `${T}${T extends ""
  ? ""
  : "."}${U}`;

type PathMatch<
  Path extends string,
  Resolve extends string[]
> = Resolve extends [infer R, ...infer Rest extends string[]]
  ? R extends Path | `${Path}.${string}`
    ? true
    : PathMatch<Path, Rest>
  : false;

type AddQuestionMarks<
  T extends object,
  D extends keyof T = DefinedKeys<T>
> = SelfMapped<Pick<T, D> & Partial<Omit<T, D>>>;

type DefinedKeys<F extends object> = {
  [K in keyof F]: undefined extends F[K] ? never : K;
}[keyof F];

type SelfMapped<T extends object> = {
  [K in keyof T]: T[K];
};

export type UnionToTupleString<T> = CastToStringTuple<UnionToTuple<T>>;

type CastToStringTuple<T> = T extends [string, ...string[]] ? T : never;

type UnionToTuple<T, Tuple extends unknown[] = []> = [T] extends [never]
  ? Tuple
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Tuple]>;

type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last
  ? Last
  : never;

type UnionToIntersectionFn<T> = (
  T extends unknown ? (k: () => T) => void : never
) extends (k: infer Intersection) => void
  ? Intersection
  : never;

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
