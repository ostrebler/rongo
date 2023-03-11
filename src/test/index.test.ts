import { test } from "vitest";
import { ObjectId } from "mongodb";
import rongo from "..";

interface Author {
  _id: ObjectId;
  name: string;
}

test("rongo", async () => {
  const db = rongo({
    url: "mongodb://localhost:27017/rongo_test",
    collections: {
      Author: {
        indexes: { name: "text" },
        schema: {
          required: ["name", "birthDate"],
          properties: {
            name: {
              bsonType: "string",
              minLength: 1
            },
            birthDate: {
              bsonType: "date"
            }
          }
        }
      },
      Book: {
        indexes: { title: "text" },
        schema: {
          required: ["title", "author"],
          properties: {
            title: {
              bsonType: "string",
              minLength: 1
            },
            author: {
              bsonType: "objectId"
            }
          }
        }
      }
    }
  });

  await db.collections.Author;
  console.log("Ready !");
});
