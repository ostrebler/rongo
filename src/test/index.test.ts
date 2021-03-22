import util from "util";
import {
  FieldSelector,
  IdentitySelector,
  IndexSelector,
  ObjectSelector,
  Rongo,
  select,
  Selector
} from "../.";
import { Author, Book, graph, rongo } from "./samples";

it("correctly loads and parses YAML and JSON configuration files", () => {
  const rongoYml = new Rongo("mongodb://localhost:27017", "rongo_test");
  rongoYml.schema("./src/test/rongo.test.yaml");
  expect(rongo.graph).toEqual(rongoYml.graph);
  expect(rongo.graph).toEqual(graph);
  rongoYml.disconnect();
});

it("correctly connects to the database", async () => {
  expect(await rongo.active()).toBe(true);
});

it("correctly inserts documents", async () => {
  await rongo.drop();

  const book = await Book.insert({
    title: "Harry Potter",
    previousBook: null,
    nextBook: undefined,
    author: {
      age: 45,
      name: "J.K. Rowling",
      favoriteBooks: [
        {
          title: "Da Vinci Code",
          previousBook: null,
          nextBook: undefined,
          author: {
            age: 60,
            name: "Dan Brown",
            favoriteBooks: []
          }
        },
        {
          title: "Lord of the Ring",
          previousBook: null,
          nextBook: undefined,
          author: {
            age: 90,
            name: "J.R.R Tolkien",
            favoriteBooks: []
          }
        }
      ]
    }
  });

  expect(await Author.count()).toBe(3);
  expect(await Book.count()).toBe(3);
});

it("correctly parses resolves", async () => {
  const s1 = select``;
  const s2 = select`label`;
  const s3 = select` nested  ${"label"}  `;
  const s4 = select` { _id,label  422  , ra-nk }  `;
  const s5 = select`${s4}`;
  const s6 = select`${{ name: "Dan Brown" }}.0.name`;
  const s7 = select`{ *, author {*} }`;
  const s8 = select`
    {
      *, 
      items {
        _id, 
        label,
        types 1 name
      }, 
      things _id, 
      tools ${(_, index) => index < 3} {
        _id  ,
        force
      }, 
      books [
        ${{ pageCount: { $lt: 200 } }},
        ${{ pageCount: { $gte: 200 } }}
      ], 
      todos [1, 4, 7]
    }
  `;

  expect(s1).toEqual(new IdentitySelector());
  expect(await Book.select`0`).toEqual(await Book.findOne());
  expect(s2).toEqual(new FieldSelector("label", new IdentitySelector()));

  expect(s3).toEqual(
    new FieldSelector(
      "nested",
      new FieldSelector("label", new IdentitySelector())
    )
  );

  expect(s4).toEqual(
    new ObjectSelector(
      new Map<string, Selector>([
        ["_id", new IdentitySelector()],
        ["label", new IndexSelector(422, new IdentitySelector())],
        ["ra-nk", new IdentitySelector()]
      ])
    )
  );

  expect(s4 === select`${s4}`).toBe(true);
  expect(s4 === select`${select`    ${s4}    `}`).toBe(true);
  expect(s5).toEqual(s4);
  expect(() => select`${s4} field`).toThrow();
  expect(await Author.select`${s6}`).toEqual("Dan Brown");

  expect(s7).toEqual(
    new ObjectSelector(
      new Map<string, Selector>([
        ["*", new IdentitySelector()],
        [
          "author",
          new ObjectSelector(
            new Map<string, Selector>([["*", new IdentitySelector()]])
          )
        ]
      ])
    )
  );

  console.log(
    util.inspect(await Book.findOneResolve({ title: "Harry Potter" }, s7), {
      depth: null
    })
  );
});

it("correctly disconnects", async () => {
  await rongo.disconnect();
});
