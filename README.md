# Rongo

> What is Rongo ?

🔰️ A Promise-based NodeJS driver for MongoDB.\
💍️ A happy marriage between the relational and the NoSQL world.\
🏃 An elegant way to escape subdocument hell without additional complexity.

---

- [Overview](#overview)
- [Get started](#)
- [Features](#)
  - [Basic operations](#)
  - [Nest insertions](#)
  - [Nest filter queries](#)
  - [Cascade-delete](#)
  - [Search document references](#)
  - [Scan the database](#)
- [Selectors](#)
- [API](#)

---

## Overview

### **▶️ Wrap your NoSQL MongoDB into a relational handler without altering the database :**

```javascript
import Rongo from "rongo.js";

const db = new Rongo("mongodb://localhost:27017/mydb");
```

### **▶️ Define a relation schema in just a few lines :**

```yaml
Author:
  foreignKeys:
    favoriteBooks.$:
      collection: Book
      onDelete: PULL
Book:
  foreignKeys:
    author:
      collection: Author
      onDelete: DELETE
```

```javascript
db.schema("schema.yaml");
```

### **▶️ Cascade-insert related documents in one instruction :**

```javascript
const Book = db.collection("Book");

await Book.insert({
  title: "Harry Potter",
  author: {
    name: "J.K. Rowling",
    favoriteBooks: [
      {
        title: "Emma",
        author: {
          name: "Jane Austen",
          favoriteBooks: []
        }
      }
    ]
  }
});
```

The **Book** and **Author** collections then respectively contain :

```bson
[
  {
    "_id": ObjectID("606cbeab251aa79ab35ffd05"),
    "title": "Emma",
    "author": ObjectID("606cbf193aaa317e81b97150")
  },
  {
    "_id": ObjectID("606cbed349af304a1e828338"),
    "title": "Harry Potter",
    "author": ObjectID("606cbf3ac0680a044501108b")
  }
]
```

```bson
[
  {
    "_id": ObjectID("606cbf193aaa317e81b97150"),
    "name": "Jane Austen",
    "favoriteBooks": []
  },
  {
    "_id": ObjectID("606cbf3ac0680a044501108b"),
    "name": "J.K. Rowling",
    "favoriteBooks": [ObjectID("606cbeab251aa79ab35ffd05")]
  }
]
```

### **▶️ Nest related filter queries :**

```javascript
await Book.find({
  author: {
    $in: {
      name: "J.K. Rowling"
    }
  }
});
```

```bson
[
  {
    "_id": ObjectID("606cbed349af304a1e828338"),
    "title": "Harry Potter",
    "author": ObjectID("606cbf3ac0680a044501108b")
  }
]
```

### **▶️ Populate and aggregate results with a simple yet expressive selection syntax :**

```javascript
await Author.findOne({ name: "J.K. Rowling" }).select`favoriteBooks title`;
```

```bson
["Emma"]
```

---

```javascript
await Book.findOne({ title: "Harry Potter" }).select`author name`;
```

```bson
"J.K. Rowling"
```

---

```javascript
await Book.findOne({ title: "Harry Potter" }).select`{ *, author { name } }`;
```

```bson
{
  "_id": ObjectID("606cbed349af304a1e828338"),
  "title": "Harry Potter",
  "author": { "name": "J.K. Rowling" }
}
```

---

> 📌 _Selectors are a powerful concept which allows you to do **really** a lot of useful things. More about them in the [Selector](h) section._

### **▶️ Cascade-delete related documents :**

```javascript
await Author.delete({ name: "Jane Austen" });
```

The **Book** and **Author** collections then respectively contain :

```bson
[
  {
    "_id": ObjectID("606cbed349af304a1e828338"),
    "title": "Harry Potter",
    "author": ObjectID("606cbf3ac0680a044501108b")
  }
]
```

```bson
[
  {
    "_id": ObjectID("606cbf3ac0680a044501108b"),
    "name": "J.K. Rowling",
    "favoriteBooks": []
  }
]
```

> 📌 _By deleting the author "Jane Austen", her book "Emma" was deleted too, and so was its entry in J.K. Rowling's favorite book list._

### Things to keep in mind :

- The augmentation of the insertion and filter syntax to include relational stuff is a superset of the original syntax. **Everything written using the conventional syntax will work with Rongo**.
- You can opt-out the relational enhancements if you wish by playing with options, and just use Rongo as a regular MongoDB driver (like [mongoose](https://github.com/Automattic/mongoose), [monk](https://github.com/Automattic/monk), [mongoist](https://github.com/mongoist/mongoist), etc.). For example :
  ```javascript
  await Author.delete({ name: "Jane Austen" }, { propagate: false });
  ```
