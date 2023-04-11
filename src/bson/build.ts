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
  BsonNumberType,
  BsonObject,
  BsonObjectId,
  BsonRecord,
  BsonReference,
  BsonRegex,
  BsonString,
  BsonTimestamp,
  BsonUnion,
  Infer
} from ".";

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
  record: <T extends BsonAny>(...args: [RegExp, T] | [T]) =>
    new BsonRecord(
      args.length === 1
        ? { builder: args[0] }
        : { pattern: args[0], builder: args[1] }
    ),
  array: <T extends BsonAny>(builder: T) => new BsonArray({ builder }),
  enum: <T extends any[]>(...values: T) => new BsonEnum({ values }),
  reference: <T extends string>(collection: T) =>
    new BsonReference({ collection, deletePolicy: "bypass" }),
  union: <T extends BsonAny[]>(...builders: T) =>
    new BsonUnion({ type: "anyOf", builders }),
  xunion: <T extends BsonAny[]>(...builders: T) =>
    new BsonUnion({ type: "oneOf", builders }),
  intersection: <T extends BsonAny[]>(...builders: T) =>
    new BsonIntersection({ builders })
};

const a = b.object({
  name: b.objectId().array().nullish(),
  age: b.number().nullable().array().description(""),
  truc: b.xunion(b.number(), b.string()),
  machin: b.reference("machin").onDelete("cascade"),
  code: b.javascript().nullable().or(b.objectId())
});

const d = b.javascript().nullable().or(b.objectId());

type C = Infer<typeof a, { machin: { x: string } }>;
