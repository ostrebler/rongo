import rongo, { ObjectId } from "../.";

async function test() {
  rongo.connect("mongodb://localhost:27017", "rongo_test");
  await rongo.drop();

  // The Author - Book example

  rongo.schema("./src/test/rongo.test.json");

  type AuthorDb = {
    _id: ObjectId;
    age: number;
    name: string;
    favoriteBooks: Array<ObjectId>;
  };

  type BookDb = {
    _id: ObjectId;
    title: string;
    previousBook: ObjectId | null;
    nextBook?: ObjectId;
    author: ObjectId;
  };

  const Author = rongo<AuthorDb>("Author");
  const Book = rongo<BookDb>("Book");

  const b = await Book.insert({
    title: "Harry Potter",
    previousBook: null,
    nextBook: undefined,
    author: {
      $$insert: {
        age: 45,
        name: "J.K. Rowling",
        favoriteBooks: [
          {
            $$insert: {
              title: "Da Vinci Code",
              previousBook: null,
              nextBook: undefined,
              author: {
                $$insert: {
                  age: 60,
                  name: "Dan Brown",
                  favoriteBooks: []
                }
              }
            }
          }
        ]
      }
    }
  });

  console.log(await Author.find());
  console.log(await Book.find());
}

test()
  .then(() => {
    console.log("Test done.");
    process.exit();
  })
  .catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
  });
