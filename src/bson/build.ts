import {
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
  BsonNumberType,
  BsonObject,
  BsonObjectId,
  BsonRecord,
  BsonReference,
  BsonRegex,
  BsonString,
  BsonTimestamp,
  BsonTuple,
  BsonUnion,
  InferBsonType
} from "./index.js";
import { ObjectId } from "mongodb";

export const b = {
  objectId: () => new BsonObjectId(),
  null: () => new BsonNull(),
  bool: () => new BsonBool(),
  date: () => new BsonDate(),
  regex: () => new BsonRegex(),
  timestamp: () => new BsonTimestamp(),
  javascript: () => new BsonJavascript(),
  binData: () => new BsonBinData(),
  number: (type: BsonNumberType = "number") => new BsonNumber({ type }),
  double: () => new BsonNumber({ type: "double" }),
  int: () => new BsonNumber({ type: "int" }),
  long: () => new BsonNumber({ type: "long" }),
  decimal: () => new BsonNumber({ type: "decimal" }),
  string: () => new BsonString(),
  object: <F extends Record<string, BsonAny>>(fields: F) =>
    new BsonObject({ fields }),
  document: <F extends Record<string, BsonAny>>(fields: F) =>
    new BsonDocument({ fields }),
  record: <T extends BsonAny>(...args: [RegExp, T] | [T]) =>
    new BsonRecord(
      args.length === 1
        ? { builder: args[0] }
        : { pattern: args[0], builder: args[1] }
    ),
  array: <T extends BsonAny>(builder: T) => new BsonArray({ builder }),
  tuple: <T extends BsonAny[]>(...builders: T) =>
    new BsonTuple<T, never>({ builders }),
  literal: <T>(value: T) => new BsonEnum({ values: [value] as [T] }),
  enum: <T extends any[]>(...values: T) => new BsonEnum({ values }),
  reference: <T extends string>(collection: T) =>
    new BsonReference({ collection, deletePolicy: "bypass" }),
  not: (builder: BsonAny) => new BsonNot({ builder }),
  union: <T extends BsonAny[]>(...builders: T) => new BsonUnion({ builders }),
  intersection: <T extends BsonAny[]>(...builders: T) =>
    new BsonIntersection({ builders })
};

const a = b.document({
  name: b.string(),
  height: b.number(),
  usr: b.reference("users")
});

type A = InferBsonType<
  typeof a,
  { users: BsonDocument<{ n: BsonNumber }> },
  ["usr"]
>;

const u: A = {
  _id: new ObjectId(),
  name: "a",
  height: 1,
  usr: {
    _id: new ObjectId(),
    n: 1
  }
};
