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
