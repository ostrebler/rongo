import { DeletePolicy, Graph, InsertPolicy, ObjectId, Rongo } from "../.";

// The main test database

export const rongo = new Rongo("mongodb://localhost:27017/rongo_test");
rongo.schema("./src/test/schema.test.json");

// Some types for TS testing

export type AuthorDb = {
  _id: ObjectId;
  name: string;
  favoriteBooks: Array<ObjectId>;
};

export type BookDb = {
  _id: ObjectId;
  title: string;
  author: ObjectId;
};

// Some test collections :

export const Author = rongo.collection<AuthorDb>("Author");
export const Book = rongo.collection<BookDb>("Book");

// The full graph that should be calculated for the test database :

export const graph: Graph = {
  Author: {
    key: "_id",
    foreignKeys: {
      favoriteBooks: {
        path: ["favoriteBooks", "$"],
        collection: "Book",
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Pull
      }
    },
    references: {
      Book: {
        author: {
          path: ["author"],
          collection: "Author",
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Delete
        }
      }
    }
  },
  Book: {
    key: "_id",
    foreignKeys: {
      author: {
        path: ["author"],
        collection: "Author",
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Delete
      }
    },
    references: {
      Author: {
        favoriteBooks: {
          path: ["favoriteBooks", "$"],
          collection: "Book",
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Pull
        }
      }
    }
  }
};
