import { DeletePolicy, Graph, InsertPolicy, ObjectId, Rongo } from "../.";

// The main test database

export const rongo = new Rongo("mongodb://localhost:27017", "rongo_test");
rongo.schema("./src/test/rongo.test.json");

// Some types for TS testing

export type AuthorDb = {
  _id: ObjectId;
  age: number;
  name: string;
  favoriteBooks: Array<ObjectId>;
};

export type BookDb = {
  _id: ObjectId;
  title: string;
  previousBook: ObjectId | null;
  nextBook?: ObjectId;
  author: ObjectId;
};

// The full graph that should be calculated for the test database :

export const graph: Graph = {
  Author: {
    primaryKey: "_id",
    foreignKeys: {
      favoriteBooks: {
        path: "favoriteBooks.$",
        collection: "Book",
        nullable: false,
        optional: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Pull
      }
    },
    references: {
      Book: {
        author: {
          path: "author",
          collection: "Author",
          nullable: false,
          optional: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Remove
        }
      }
    }
  },
  Book: {
    primaryKey: "_id",
    foreignKeys: {
      previousBook: {
        path: "previousBook",
        collection: "Book",
        nullable: true,
        optional: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Nullify
      },
      nextBook: {
        path: "nextBook",
        collection: "Book",
        nullable: false,
        optional: true,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Unset
      },
      author: {
        path: "author",
        collection: "Author",
        nullable: false,
        optional: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Remove
      }
    },
    references: {
      Author: {
        favoriteBooks: {
          path: "favoriteBooks.$",
          collection: "Book",
          nullable: false,
          optional: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Pull
        }
      },
      Book: {
        previousBook: {
          path: "previousBook",
          collection: "Book",
          nullable: true,
          optional: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Nullify
        },
        nextBook: {
          path: "nextBook",
          collection: "Book",
          nullable: false,
          optional: true,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Unset
        }
      }
    }
  }
};
