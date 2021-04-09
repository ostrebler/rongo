import { WithId } from "mongodb";
import { SelectArgument, SelectionOption, Selector } from ".";

// Used to store the collection dependencies in an optimally exploitable manner

export type Graph = {
  [collection: string]: CollectionConfig;
};

export type CollectionConfig = {
  key: string;
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
  onInsert: InsertPolicy;
  onDelete: DeletePolicy;
};

// Used to express the collection dependencies in a user-friendly way

export type Schema = {
  [collection: string]: {
    key?: string;
    foreignKeys?: {
      [foreignKeyPath: string]: {
        collection?: string;
        onInsert?: InsertPolicy;
        onDelete?: DeletePolicy;
      };
    };
  };
};

// The actions one can apply when documents are inserted

export enum InsertPolicy {
  Bypass = "BYPASS",
  Verify = "VERIFY"
}

// The actions one can apply when documents are deleted

export enum DeletePolicy {
  Bypass = "BYPASS",
  Reject = "REJECT", // *
  Delete = "DELETE", // *
  Unset = "UNSET", // *
  Nullify = "NULLIFY", // *
  Pull = "PULL" // x.**.$.**
}

// Used as database scan result object :

export type DanglingKeys = {
  [collection: string]: {
    [foreignKey: string]: Array<any>;
  };
};

// The general type constraint for documents

export type Document = object;

// Used to locate a key with precision

export type Path = Array<string>;

// Used by collection select ops to type-check selectable resource

export type SelectableUnit<T extends Document> = T | WithId<T>;

export type Selectable<T extends Document> =
  | null
  | undefined
  | SelectableUnit<T>
  | Partial<SelectableUnit<T>>
  | Array<SelectableUnit<T>>;

// Used by collection to add selection to promises

export type SelectablePromise<T> = Promise<T> & {
  select<K extends T extends Array<infer U> ? keyof U : never>(
    selector: K,
    options?: SelectionOption
  ): Promise<T extends Array<infer U> ? Array<U[K]> : never>;
  select<K extends keyof T>(
    selector: K,
    options?: SelectionOption
  ): Promise<T[K]>;
  select(selector: string | Selector, options?: SelectionOption): Promise<any>;
  select(
    chunks: TemplateStringsArray,
    ...args: Array<SelectArgument>
  ): Promise<any>;
};

// Used when collecting foreign references to keys

export type References = {
  [collection: string]: {
    [foreignKey: string]: Array<any>;
  };
};
