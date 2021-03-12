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

/*
type Book = {
  _id: string;
  related: ObjectId;
  sameAuthor: Array<string>;
  nested: {
    inner: ObjectId;
  };
};

// tests

let expr1: InsertionDoc<Book> = {
  _id: "1",
  related: new ObjectId(),
  sameAuthor: ["3", "4"],
  nested: {
    inner: new ObjectId()
  }
};

let expr2: InsertionDoc<Book> = {
  _id: "1",
  related: {
    $$insert: expr1
  },
  sameAuthor: ["4", { $$insert: expr1 }],
  nested: {
    inner: {
      $$insert: expr1
    }
  }
};

let expr3: InsertionDoc<Book> = {
  _id: "1",
  related: true, // Error: Should be ObjectId | InsertionOperator,
  sameAuthor: [45], // Error: Should be string | InsertionOperator
  nested: {
    inner: [] // Error: Should be ObjectId | InsertionOperator
  }
};

let expr4: InsertionDoc<Book> = {
  _id: "1",
  related: new ObjectId(),
  sameAuthor: {
    // Error: Should be (string | InsertionOperator)[]
    $$insert: expr1
  },
  nested: {
    inner: new ObjectId()
  }
};

let expr5: InsertionDoc<Book> = {
  _id: "1",
  related: {
    $$insert: 5 // Error: Should fail
  },
  sameAuthor: {
    $$insert: [expr1]
  },
  nested: {
    inner: {
      $$insert: expr1
    }
  }
};

let expr6: InsertionDoc<Book> = {
  _id: "1",
  related: {
    $$insert: [] // Error: Should fail
  },
  sameAuthor: [],
  nested: {
    inner: new ObjectId()
  }
};
*/
