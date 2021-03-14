export type Graph = {
  [collection: string]: CollectionConfig;
};

export type CollectionConfig = {
  primaryKey: string;
  foreignKeys: ForeignKeysConfig;
  references: {
    [collection: string]: ForeignKeysConfig;
  };
};

export type ForeignKeysConfig = {
  [foreignKey: string]: ForeignKeyConfig;
};

export type ForeignKeyConfig = {
  path: string;
  collection: string;
  nullable: boolean;
  optional: boolean;
  onInsert: InsertPolicy;
  onDelete: DeletePolicy;
};

export type Schema = {
  [collection: string]: {
    primary?: string;
    foreign?: {
      [foreignKeyPath: string]: {
        collection?: string;
        nullable?: boolean;
        optional?: boolean;
        onInsert?: InsertPolicy;
        onDelete?: DeletePolicy;
      };
    };
  };
};

export type Document = object;

export enum InsertPolicy {
  Bypass = "BYPASS",
  Verify = "VERIFY"
}

export enum DeletePolicy {
  Bypass = "BYPASS",
  Reject = "REJECT", // *
  Remove = "REMOVE", // *
  Nullify = "NULLIFY", // * (and "nullable" must be true)
  Unset = "UNSET", // x.**.y (and "optional" must be true)
  Pull = "PULL" // x.**.$ | x.**.$.**.y
}
