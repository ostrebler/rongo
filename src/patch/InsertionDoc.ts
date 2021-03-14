import { OptionalId } from "mongodb";
import { Document, ObjectId } from "../.";

export type InsertionDoc<T extends Document> = InsertionDocPatch<OptionalId<T>>;

export type InsertionDocs<T extends Document> = Array<InsertionDoc<T>>;

export type InsertionOperator = { $$insert: InsertionDoc<any> };

export type ManyInsertionOperator = { $$insert: InsertionDocs<any> };

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
