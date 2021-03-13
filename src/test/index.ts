import rongo, { ObjectId, select } from "../.";

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

  const book = await Book.insert({
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
          },
          {
            $$insert: {
              title: "Lord of the Ring",
              previousBook: null,
              nextBook: undefined,
              author: {
                $$insert: {
                  age: 90,
                  name: "J.R.R Tolkien",
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
  console.log("--------------");
  console.log(await Book.find());
  console.log("--------------");
  const selector = select`
    $$
    author
    favoriteBooks
    ${book => book.title.startsWith("L")}
    author
    name
  `;
  console.log(selector);
  console.log("--------------");
  console.log(await Book.resolve([book, book, book], selector));
  console.log("--------------");
  const previousBook = await Book.resolve(book, "  previousBook.a");
  console.log(previousBook);
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
