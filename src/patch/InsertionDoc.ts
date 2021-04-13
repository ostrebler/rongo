import { OptionalId } from "mongodb";
import { Document, ObjectID } from "../.";

export type InsertionDoc<T extends Document> = InsertionDocPatch<OptionalId<T>>;

export type InsertionDocPatch<T extends Document> = {
  [K in keyof T]: PrimitivePatch<T[K]>;
};

export type PrimitivePatch<T> = T extends object
  ? T extends ObjectID
    ? ObjectID | InsertionDoc<any>
    : InsertionDocPatch<T>
  : T | InsertionDoc<any>;
