import rongo, { ObjectId, RemovePolicy } from ".";

async function test() {
  rongo.connect("mongodb://localhost:27017", "rongo_test");
  await rongo.drop();

  // The Author - Book example

  type AuthorDb = {
    _id: ObjectId;
    age: number;
    name: string;
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

  console.log(JSON.stringify(rongo._database.graph, null, 2));

  const Author = rongo<AuthorDb>("Author");
  const Book = rongo<BookDb>("Book");

  const [kevin, denis, jack] = await Author.insertMany([
    {
      age: 32,
      name: "Kevin"
    },
    {
      age: 63,
      name: "Denis"
    },
    {
      age: 50,
      name: "Jack"
    }
  ]);

  const [book1, book2, book3, book4] = await Book.insertMany([
    {
      title: "Book 1",
      previous: null,
      author: kevin._id
    },
    {
      title: "Book 2",
      previous: null,
      author: denis._id
    },
    {
      title: "Book 3",
      previous: null,
      author: denis._id
    },
    {
      title: "Book 4",
      previous: null,
      author: jack._id
    }
  ]);
}

test()
  .then(() => console.log("Test done."))
  .catch(e => console.error("Error:", e.message));
