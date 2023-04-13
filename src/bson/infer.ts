import {
  AddQuestionMarks,
  BsonAny,
  BsonArray,
  BsonBinData,
  BsonBool,
  BsonDate,
  BsonDocument,
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
  BsonUnion,
  JoinPath,
  OptionalId,
  PathMatch
} from "./index.js";
import { Code, ObjectId } from "mongodb";

// Document type inference from BSON schema

export type InferBsonType<
  BsonType extends BsonAny,
  Cols extends Record<string, BsonDocument>,
  Resolve extends string[] = []
> = Infer<BsonType, Cols, false, "", Resolve>;

export type InferBsonInsertType<
  BsonType extends BsonAny,
  Cols extends Record<string, BsonDocument>
> = Infer<BsonType, Cols, true, "", []>;

type Infer<
  BsonType extends BsonAny,
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
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
  : BsonType extends BsonDocument
  ? InferBsonDocument<BsonType, Cols, Insert, Path, Resolve>
  : BsonType extends BsonObject<infer F>
  ? InferBsonObject<F, Cols, Insert, Path, Resolve>
  : BsonType extends BsonRecord<infer T>
  ? Record<string, Infer<T, Cols, Insert, JoinPath<Path, string>, Resolve>>
  : BsonType extends BsonArray<infer T>
  ? Infer<T, Cols, Insert, Path, Resolve>[]
  : BsonType extends BsonTuple<infer T, infer R>
  ? InferBsonTuple<T, R, Cols, Insert, Path, Resolve>
  : BsonType extends BsonEnum<infer T>
  ? T[number]
  : BsonType extends BsonReference<infer T>
  ? InferBsonReference<T, Cols, Insert, Path, Resolve>
  : BsonType extends BsonOptional<infer T>
  ? Infer<T, Cols, Insert, Path, Resolve> | undefined
  : BsonType extends BsonNot
  ? any // would require subtraction types (any ~ T)
  : BsonType extends BsonUnion<infer T>
  ? InferBsonUnion<T, Cols, Insert, Path, Resolve>
  : BsonType extends BsonIntersection<infer T>
  ? InferBsonIntersection<T, Cols, Insert, Path, Resolve>
  : unknown;

type InferBsonDocument<
  BsonDoc extends BsonDocument,
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = BsonDoc extends BsonObject<infer F>
  ? InferBsonObject<F, Cols, Insert, Path, Resolve> extends infer Doc
    ? Insert extends true
      ? OptionalId<Doc>
      : Doc
    : never
  : never;

type InferBsonObject<
  F extends Record<string, BsonAny>,
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = AddQuestionMarks<{
  [K in keyof F & string]: Infer<
    F[K],
    Cols,
    Insert,
    JoinPath<Path, K>,
    Resolve
  >;
}>;

type InferBsonTuple<
  T extends BsonAny[],
  R extends BsonAny,
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer T2 extends BsonAny[]]
  ? [
      Infer<B, Cols, Insert, Path, Resolve>,
      ...InferBsonTuple<T2, R, Cols, Insert, Path, Resolve>
    ]
  : [R] extends [never]
  ? []
  : Infer<R, Cols, Insert, Path, Resolve>[];

type InferBsonReference<
  T extends string,
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = Insert extends true
  ? ObjectId | Infer<Cols[T], Cols, Insert, Path, Resolve>
  : PathMatch<Path, Resolve> extends true
  ? T extends keyof Cols
    ? Infer<Cols[T], Cols, Insert, Path, Resolve>
    : never
  : ObjectId;

type InferBsonUnion<
  T extends BsonAny[],
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ?
      | Infer<B, Cols, Insert, Path, Resolve>
      | InferBsonUnion<R, Cols, Insert, Path, Resolve>
  : never;

type InferBsonIntersection<
  T extends BsonAny[],
  Cols extends Record<string, BsonDocument>,
  Insert extends boolean,
  Path extends string,
  Resolve extends string[]
> = T extends [infer B extends BsonAny, ...infer R extends BsonAny[]]
  ? Infer<B, Cols, Insert, Path, Resolve> &
      InferBsonIntersection<R, Cols, Insert, Path, Resolve>
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
