import { test } from "vitest";
import rongo, { b } from "../index.js";

test("rongo", async () => {
  const db = rongo({
    url: "mongodb://localhost:27017/rongo_test",
    collections: {
      Author: {
        indexes: { name: "text" },
        schema: b.document({
          name: b.string().min(1),
          birthDate: b.date()
        }),
        validationLevel: "strict"
      },
      Book: {
        indexes: { title: "text" },
        schema: b.document({
          title: b.string().min(1).index("text"),
          author: b.reference("Author")
        })
      }
    }
  });

  const a = db.collections.Author;

  await a.insertOne({
    name: "John Doe",
    birthDate: new Date()
  });

  /*const Author: Collection<AuthorDb> = db.collections.Author;
  await Author.insertOne({
    name: "John Doe",
    birthDate: new Date()
  });*/
});

const u: any = {
  url: "mongodb://localhost:27017/rongo_test",
  collections: {
    Author: b.document({
      name: b.string().min(1).textIndex(),
      birthDate: b.date()
    }),
    Book: b.document({
      title: b.string().min(1).index("text"),
      author: b.reference("Author")
    })
  }
};
