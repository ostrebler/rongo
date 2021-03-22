// Used internally to keep track of the current location during object traversals :

export type Stack = Array<string | number>;

// Used by mapDeep to customize the transformation

export type MapDeepCustomizer = (value: any, stack: Stack, parent: any) => any;
