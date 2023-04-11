import { clone, keys, mapValues } from "lodash-es";
import {
  emailRegex,
  ipRegex,
  ipv4Regex,
  ipv6Regex,
  isoDateRegex,
  JsonSchema,
  UnionToTupleString,
  urlRegex,
  uuidRegex
} from ".";

export type BsonCommonConfig = {
  description?: string;
};

export abstract class BsonAny {
  protected constructor(public commonConfig?: BsonCommonConfig) {}

  jsonSchema(): JsonSchema {
    return JSON.parse(
      JSON.stringify({
        description: this.commonConfig?.description,
        ...this._jsonSchema()
      })
    );
  }

  abstract _jsonSchema(): JsonSchema;

  description(description: string) {
    const copy = clone(this);
    copy.commonConfig = { ...copy.commonConfig, description };
    return copy;
  }

  optional() {
    return new BsonOptional({ builder: this });
  }

  nullable(): BsonUnion<[this, BsonNull]> {
    return new BsonUnion({ type: "anyOf", builders: [this, new BsonNull()] });
  }

  nullish() {
    return this.nullable().optional();
  }

  record(pattern?: RegExp) {
    return new BsonRecord({ builder: this, pattern });
  }

  array() {
    return new BsonArray({ builder: this });
  }

  or<T extends BsonAny>(builder: T): BsonUnion<[this, T]> {
    return new BsonUnion({ type: "anyOf", builders: [this, builder] });
  }

  xor<T extends BsonAny>(builder: T): BsonUnion<[this, T]> {
    return new BsonUnion({ type: "oneOf", builders: [this, builder] });
  }

  and<T extends BsonAny>(builder: T): BsonIntersection<[this, T]> {
    return new BsonIntersection({ builders: [this, builder] });
  }
}

// BsonObjectId

export class BsonObjectId extends BsonAny {
  private _isBsonObjectId!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "objectId" };
  }
}

// BsonNull

export class BsonNull extends BsonAny {
  private _isBsonNull!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "null" };
  }
}

// BsonBool

export class BsonBool extends BsonAny {
  private _isBsonBool!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "bool" };
  }
}

// BsonDate

export class BsonDate extends BsonAny {
  private _isBsonDate!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "date" };
  }
}

// BsonRegex

export class BsonRegex extends BsonAny {
  private _isBsonRegex!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "regex" };
  }
}

// BsonTimestamp

export class BsonTimestamp extends BsonAny {
  private _isBsonTimestamp!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "timestamp" };
  }
}

// BsonJavascript

export class BsonJavascript extends BsonAny {
  private _isBsonJavascript!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "javascript" };
  }
}

// BsonBinData

export class BsonBinData extends BsonAny {
  private _isBsonBinData!: true;

  constructor(commonConfig?: BsonCommonConfig) {
    super(commonConfig);
  }

  _jsonSchema() {
    return { bsonType: "binData" };
  }
}

// BsonNumber

export type BsonNumberType = "number" | "double" | "int" | "long" | "decimal";

export type BsonNumberConfig = {
  type: BsonNumberType;
  min?: number;
  max?: number;
  xMin?: number;
  xMax?: number;
  multipleOf?: number;
};

export class BsonNumber extends BsonAny {
  private _isBsonNumber!: true;

  constructor(
    public config: BsonNumberConfig,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      ...super.jsonSchema(),
      bsonType: this.config.type,
      minimum: this.config.min,
      maximum: this.config.max,
      exclusiveMinimum: this.config.xMin,
      exclusiveMaximum: this.config.xMax,
      multipleOf: this.config.multipleOf
    };
  }

  private extend(config: Partial<BsonNumberConfig>) {
    return new BsonNumber({ ...this.config, ...config }, this.commonConfig);
  }

  gt(xMin: number) {
    return this.extend({ xMin });
  }

  gte(min: number) {
    return this.extend({ min });
  }

  lt(xMax: number) {
    return this.extend({ xMax });
  }

  lte(max: number) {
    return this.extend({ max });
  }

  positive() {
    return this.gt(0);
  }

  negative() {
    return this.lt(0);
  }

  nonnegative() {
    return this.gte(0);
  }

  nonpositive() {
    return this.lte(0);
  }

  multipleOf(multipleOf: number) {
    return this.extend({ multipleOf });
  }
}

// BsonString

export type BsonStringConfig = {
  minLen?: number;
  maxLen?: number;
  pattern?: RegExp;
};

export class BsonString extends BsonAny {
  private _isBsonString!: true;

  constructor(
    public config?: BsonStringConfig,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      bsonType: "string",
      minLength: this.config?.minLen,
      maxLength: this.config?.maxLen,
      pattern: this.config?.pattern?.source
    };
  }

  private extend(config: Partial<BsonStringConfig>) {
    return new BsonString({ ...this.config, ...config }, this.commonConfig);
  }

  min(minLen: number) {
    return this.extend({ minLen });
  }

  max(maxLen: number) {
    return this.extend({ maxLen });
  }

  length(len: number) {
    return this.min(len).max(len);
  }

  regex(pattern: RegExp) {
    return this.extend({ pattern });
  }

  email() {
    return this.regex(emailRegex);
  }

  uuid() {
    return this.regex(uuidRegex);
  }

  isoDate() {
    return this.regex(isoDateRegex);
  }

  url() {
    return this.regex(urlRegex);
  }

  ip(v?: number) {
    if (v === 4) return this.regex(ipv4Regex);
    if (v === 6) return this.regex(ipv6Regex);
    return this.regex(ipRegex);
  }
}

// BsonObject

export type BsonObjectConfig<F extends Record<string, BsonAny>> = {
  fields: F;
  strict?: boolean;
};

export class BsonObject<F extends Record<string, BsonAny>> extends BsonAny {
  private _isBsonObject!: true;

  constructor(
    public config: BsonObjectConfig<F>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      bsonType: "object",
      required: keys(this.config.fields).filter(
        key => !(this.config.fields[key] instanceof BsonOptional)
      ),
      properties: mapValues(this.config.fields, field => field.jsonSchema()),
      additionalProperties: !this.config.strict && undefined
    };
  }

  private extend(config: Partial<BsonObjectConfig<F>>) {
    return new BsonObject({ ...this.config, ...config }, this.commonConfig);
  }

  keyof() {
    return new BsonEnum({
      values: keys(this.config.fields) as UnionToTupleString<keyof F>
    });
  }

  strict() {
    return this.extend({ strict: true });
  }

  passthrough() {
    return this.extend({ strict: false });
  }
}

// BsonRecord

export type BsonRecordConfig<T extends BsonAny> = {
  builder: T;
  pattern?: RegExp;
  minProps?: number;
  maxProps?: number;
};

export class BsonRecord<T extends BsonAny> extends BsonAny {
  private _isBsonRecord!: true;

  constructor(
    public config: BsonRecordConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      bsonType: "object",
      minProperties: this.config.minProps,
      maxProperties: this.config.maxProps,
      ...(!this.config.pattern
        ? { additionalProperties: this.config.builder.jsonSchema() }
        : {
            patternProperties: {
              [this.config.pattern.source]: this.config.builder.jsonSchema()
            }
          })
    };
  }

  private extend(config: Partial<BsonRecordConfig<T>>) {
    return new BsonRecord({ ...this.config, ...config }, this.commonConfig);
  }

  pattern(pattern: RegExp) {
    return this.extend({ pattern });
  }

  min(minProps: number) {
    return this.extend({ minProps });
  }

  max(maxProps: number) {
    return this.extend({ maxProps });
  }
}

// BsonArray

export type BsonArrayConfig<T extends BsonAny> = {
  builder: T;
  minLen?: number;
  maxLen?: number;
  unique?: boolean;
};

export class BsonArray<T extends BsonAny> extends BsonAny {
  private _isBsonArray!: true;

  constructor(
    public config: BsonArrayConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      bsonType: "array",
      minItems: this.config.minLen,
      maxItems: this.config.maxLen,
      uniqueItems: this.config.unique,
      items: this.config.builder.jsonSchema()
    };
  }

  private extend(config: Partial<BsonArrayConfig<T>>) {
    return new BsonArray({ ...this.config, ...config }, this.commonConfig);
  }

  min(minLen: number) {
    return this.extend({ minLen });
  }

  max(maxLen: number) {
    return this.extend({ maxLen });
  }

  length(len: number) {
    return this.min(len).max(len);
  }

  nonempty() {
    return this.min(1);
  }

  unique() {
    return this.extend({ unique: true });
  }
}

// BsonEnum

export type BsonEnumConfig<T extends any[]> = {
  values: T;
};

export class BsonEnum<T extends any[]> extends BsonAny {
  private _isBsonEnum!: true;

  constructor(
    public config: BsonEnumConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      enum: this.config.values
    };
  }
}

// BsonReference

export type DeletePolicy =
  | "bypass"
  | "reject"
  | "cascade"
  | "unset"
  | "nullify"
  | "pull";

export type BsonReferenceConfig<T extends string> = {
  collection: T;
  deletePolicy: DeletePolicy;
};

export class BsonReference<T extends string> extends BsonAny {
  private _isBsonReference!: true;

  constructor(
    public config: BsonReferenceConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    return {
      bsonType: "objectId"
    };
  }

  private extend(config: Partial<BsonReferenceConfig<T>>) {
    return new BsonReference({ ...this.config, ...config }, this.commonConfig);
  }

  onDelete(deletePolicy: DeletePolicy) {
    return this.extend({ deletePolicy });
  }
}

// BsonOptional

export type BsonOptionalConfig<T extends BsonAny> = {
  builder: T;
};

export class BsonOptional<T extends BsonAny> extends BsonAny {
  private _isBsonOptional!: true;

  constructor(
    public config: BsonOptionalConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    // BsonOptional only makes sense in context of an object definition ("undefined" is a
    // deprecated bson type) so optionality is handled there and ignored here
    return this.config.builder.jsonSchema();
  }
}

// BsonUnion

export type BsonUnionType = "anyOf" | "oneOf";

export type BsonUnionConfig<T extends BsonAny[]> = {
  type: BsonUnionType;
  builders: T;
};

export class BsonUnion<T extends BsonAny[]> extends BsonAny {
  private _isBsonUnion!: true;

  constructor(
    public config: BsonUnionConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    const flattenDeep = (builders: BsonAny[]): BsonAny[] =>
      builders.flatMap(builder =>
        builder instanceof BsonUnion && builder.config.type === this.config.type
          ? flattenDeep(builder.config.builders)
          : [builder]
      );
    return {
      [this.config.type]: flattenDeep(this.config.builders).map(builder =>
        builder.jsonSchema()
      )
    };
  }
}

// BsonIntersection

export type BsonIntersectionConfig<T extends BsonAny[]> = {
  builders: T;
};

export class BsonIntersection<T extends BsonAny[]> extends BsonAny {
  private _isBsonIntersection!: true;

  constructor(
    public config: BsonIntersectionConfig<T>,
    commonConfig?: BsonCommonConfig
  ) {
    super(commonConfig);
  }

  _jsonSchema() {
    const flattenDeep = (builders: BsonAny[]): BsonAny[] =>
      builders.flatMap(builder =>
        builder instanceof BsonIntersection
          ? flattenDeep(builder.config.builders)
          : [builder]
      );
    return {
      allOf: flattenDeep(this.config.builders).map(builder =>
        builder.jsonSchema()
      )
    };
  }
}
