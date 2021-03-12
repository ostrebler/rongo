import rongo, { FilterQuery, normalizeFilterQuery, ObjectId } from "../.";

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

  const [kevin, denis, jack] = await Author.insertMany([
    {
      age: 32,
      name: "Kevin",
      favoriteBooks: []
    },
    {
      age: 63,
      name: "Denis",
      favoriteBooks: []
    },
    {
      age: 50,
      name: "Jack",
      favoriteBooks: []
    }
  ]);

  const [book1, book2] = await Book.insertMany([
    {
      title: "Book 1",
      previousBook: null,
      author: kevin._id
    },
    {
      title: "Book 2",
      previousBook: null,
      author: denis._id
    }
  ]);

  const [book3, book4, book5] = await Book.insertMany([
    {
      title: "Book 3",
      previousBook: book1._id,
      author: denis._id
    },
    {
      title: "Book 4",
      previousBook: null,
      nextBook: book2._id,
      author: jack._id
    },
    {
      title: "Book 5",
      previousBook: book1._id,
      author: jack._id
    }
  ]);

  const filter: FilterQuery<AuthorDb> = {
    $and: [
      {
        age: { $lt: 40 },
        favoriteBooks: {
          $$in: {
            previousBook: null
          },
          $$nin: {
            previousBook: book1._id
          }
        }
      }
    ]
  };

  console.log(
    JSON.stringify(await normalizeFilterQuery(Author, filter), null, 2)
  );

  console.log(
    await Book.find({
      previousBook: {
        $$in: {
          author: kevin._id
        }
      }
    })
  );
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
