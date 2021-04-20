import { ForeignKey, PrimaryKey } from "../.";

// Used internally to keep track of the current location during object traversals :

export type Stack = Array<string | number>;

// Used by mapDeep to customize the transformation

export type MapDeepCustomizer = (value: any, stack: Stack, parent: any) => any;

// Used by propagateRemove to schedule operations in a lazy way

export type RemoveScheduler = Array<() => Promise<any>>;

// Used by propagateRemove to mark deleted primary keys

export type DeletedKeys = {
  [collection: string]: Array<any>;
};

// Used to tweak the findReferences algorithm

export type FindReferencesOptions = {
  collections?: Array<string>;
  excludeCollections?: Array<string>;
  keysOnly?: boolean;
};

// Used when collecting foreign references to document(s)

export type References = {
  [collection: string]: {
    [foreignKey: string]: Array<any>;
  };
};

// Used as database scan result object :

export type DanglingKeys = {
  [collection: string]: {
    [foreignKey: string]: Array<any>;
  };
};

// Used to find the primary key of a document

export type PrimaryKeyOf<T> = T extends PrimaryKey<infer Type>
  ? Type
  : T extends ForeignKey<any>
  ? never
  : T extends object
  ? PrimaryKeyOf<T[keyof T]>
  : never;

// Used to transform a rich document type into a plain document type

export type DocumentOf<T> = T extends PrimaryKey<infer Type>
  ? Type
  : T extends ForeignKey<infer Document>
  ? PrimaryKeyOf<Document>
  : T extends object
  ? { [K in keyof T]: DocumentOf<T[K]> }
  : T;
