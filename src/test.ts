import rongo, {
  FilterQuery,
  normalizeFilterQuery,
  ObjectId,
  RemovePolicy
} from ".";

async function test() {
  rongo.connect("mongodb://localhost:27017", "rongo_test");
  await rongo.drop();

  // The Author - Book example

  type AuthorDb = {
    _id: ObjectId;
    age: number;
    name: string;
    favoriteBooks: Array<ObjectId>;
  };

  type BookDb = {
    _id: ObjectId;
    title: string;
    previous: ObjectId | null;
    author: ObjectId;
  };

  rongo.schema({
    Author: {
      foreign: {
        "favoriteBooks.$": {
          collection: "Book",
          onRemove: RemovePolicy.Pull
        }
      }
    },
    Book: {
      foreign: {
        previousBook: {
          nullable: true,
          onRemove: RemovePolicy.Nullify
        },
        nextBook: {
          optional: true,
          onRemove: RemovePolicy.Unset
        },
        author: {
          collection: "Author",
          onRemove: RemovePolicy.Remove
        }
      }
    }
  });

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
      previous: null,
      author: kevin._id
    },
    {
      title: "Book 2",
      previous: null,
      author: denis._id
    }
  ]);

  const [book3, book4, book5] = await Book.insertMany([
    {
      title: "Book 3",
      previous: book2._id,
      author: denis._id
    },
    {
      title: "Book 4",
      previous: null,
      author: jack._id
    },
    {
      title: "Book 5",
      previous: book1._id,
      author: jack._id
    }
  ]);

  const filter: FilterQuery<AuthorDb> = {
    $and: [
      {
        age: { $lt: 40 },
        favoriteBooks: {
          $$in: {
            previous: null
          }
        }
      }
    ]
  };

  console.log(
    JSON.stringify(await normalizeFilterQuery(Author, filter), null, 2)
  );
}

test()
  .then(() => {
    console.log("Test done.");
    process.exit();
  })
  .catch(e => console.error("Error:", e.message));
