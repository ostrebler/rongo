import rongo, {
  createRongo,
  InsertionDoc,
  InsertionDocs,
  is,
  ObjectId,
  select
} from "../.";

it("loads configuration files", async () => {
  const rongo = createRongo();
  rongo.schema("./src/test/rongo.test.yaml");
});

it("functions", async () => {
  await rongo.connect("mongodb://localhost:27017", "rongo_test");
  await rongo.drop();

  // The Author - Book example

  rongo.schema("./src/test/rongo.test.yaml");

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
      $$insert: is<InsertionDoc<AuthorDb>>({
        age: 45,
        name: "J.K. Rowling",
        favoriteBooks: {
          $$insert: is<InsertionDocs<BookDb>>([
            {
              title: "Da Vinci Code",
              previousBook: null,
              nextBook: undefined,
              author: {
                $$insert: is<InsertionDoc<AuthorDb>>({
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
                $$insert: is<InsertionDoc<AuthorDb>>({
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

  const selector = select`
    author
    favoriteBooks
    $
    title
  `;

  console.log(selector);

  console.log(await Book.resolve([book, book, book], selector));

  const previousBook = await Book.resolve(book, "previousBook");
  console.log(previousBook);

  const r = await Book.findResolve({}, "_id");
  console.log("List of ObjectIds: ", r);
});
