import { ObjectId, OptionalId } from "mongodb";
import { Document } from "../.";

export type InsertionDoc<T extends Document> = InsertionDocPatch<OptionalId<T>>;

export type InsertionOperator = { $$insert: InsertionDoc<any> };

export type ManyInsertionOperator = { $$insert: Array<InsertionDoc<any>> };

export type InsertionDocPatch<T> = T extends object
  ? T extends ObjectId
    ? T | InsertionOperator
    :
        | { [K in keyof T]: InsertionDocPatch<T[K]> }
        | (T extends Array<infer U>
            ? U extends object
              ? U extends ObjectId
                ? ManyInsertionOperator
                : never
              : ManyInsertionOperator
            : never)
  : T | InsertionOperator;
