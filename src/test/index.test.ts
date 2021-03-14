import { isInsert, Rongo } from "../.";
import { AuthorDb, BookDb, graph, rongo } from "./samples";

it("correctly loads and parses YAML and JSON configuration files", () => {
  const rongoy = new Rongo("mongodb://localhost:27017", "rongo_test");
  rongoy.schema("./src/test/rongo.test.yaml");
  expect(rongo.graph).toEqual(rongoy.graph);
  expect(rongo.graph).toEqual(graph);
  rongoy.disconnect();
});

it("correctly connects to the database", async () => {
  expect(await rongo.active()).toBe(true);
});

it("correctly inserts documents", async () => {
  await rongo.drop();

  const Author = rongo.collection<AuthorDb>("Author");
  const Book = rongo.collection<BookDb>("Book");

  const book = await Book.insert({
    title: "Harry Potter",
    previousBook: null,
    nextBook: undefined,
    author: {
      $$insert: isInsert<AuthorDb>({
        age: 45,
        name: "J.K. Rowling",
        favoriteBooks: {
          $$insert: isInsert<BookDb>([
            {
              title: "Da Vinci Code",
              previousBook: null,
              nextBook: undefined,
              author: {
                $$insert: isInsert<AuthorDb>({
                  age: 60,
                  name: "Dan Brown",
                  favoriteBooks: []
                })
              }
            },
            {
              title: "Lord of the Ring",
              previousBook: null,
              nextBook: undefined,
              author: {
                $$insert: isInsert<AuthorDb>({
                  age: 90,
                  name: "J.R.R Tolkien",
                  favoriteBooks: []
                })
              }
            }
          ])
        }
      })
    }
  });
});

it("correctly resolves values", async () => {});

it("correctly disconnects", async () => {
  await rongo.disconnect();
});
