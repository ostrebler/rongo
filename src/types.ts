import { FindOneOptions, WithId } from "mongodb";
import { FilterQuery } from "./patch";

// Used to store the collection dependencies in an optimally exploitable manner :

export type Graph = {
  [collection: string]: CollectionConfig;
};

export type CollectionConfig = {
  primaryKey: string;
  foreignKeys: {
    [foreignKey: string]: ForeignKeyConfig;
  };
  references: {
    [collection: string]: {
      [foreignKey: string]: ForeignKeyConfig;
    };
  };
};

export type ForeignKeyConfig = {
  path: Path;
  collection: string;
  optional: boolean;
  nullable: boolean;
  onInsert: InsertPolicy;
  onDelete: DeletePolicy;
};

// Used to express the collection dependencies in a user-friendly way :

export type Schema = {
  [collection: string]: {
    primary?: string;
    foreign?: {
      [foreignKeyPath: string]: {
        collection?: string;
        optional?: boolean;
        nullable?: boolean;
        onInsert?: InsertPolicy;
        onDelete?: DeletePolicy;
      };
    };
  };
};

// The actions one can apply when documents are inserted :

export enum InsertPolicy {
  Bypass = "BYPASS",
  Verify = "VERIFY"
}

// The actions one can apply when documents are deleted :

export enum DeletePolicy {
  Bypass = "BYPASS",
  Reject = "REJECT", // *
  Remove = "REMOVE", // *
  Unset = "UNSET", // * (and "optional" must be true)
  Nullify = "NULLIFY", // * (and "nullable" must be true)
  Pull = "PULL" // x.**.$.**
}

// The general type constraint for documents :

export type Document = object;

// Used to locate a key with precision

export type Path = Array<string>;

// Used by collection select ops to type-check selectable resource :

export type Selectable<T extends Document> =
  | T
  | WithId<T>
  | Array<T>
  | Array<WithId<T>>;

// Used by collection select ops :

export type CollectionSelector<T extends Document> = {
  (document: Selectable<T>): Promise<any>;
  find(
    query?: FilterQuery<T>,
    options?: FindOneOptions<T extends T ? T : T>
  ): Promise<any>;
  findOne(
    query?: FilterQuery<T>,
    options?: FindOneOptions<T extends T ? T : T>
  ): Promise<any>;
};
