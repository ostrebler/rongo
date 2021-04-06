# Rongo

A happy marriage between relational storage and the NoSQL world. Promise-based.

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

```
{ _id: ObjectID("606cbeab251aa79ab35ffd05"), title: "Emma", author: ObjectID("606cbf193aaa317e81b97150") }
{ _id: ObjectID("606cbed349af304a1e828338"), title: "Harry Potter", author: ObjectID("606cbf3ac0680a044501108b") }
```

```
{ _id: ObjectID("606cbf193aaa317e81b97150"), name: "Jane Austen", favoriteBooks: [] }
{ _id: ObjectID("606cbf3ac0680a044501108b"), name: "J.K. Rowling", favoriteBooks: [ObjectID("606cbeab251aa79ab35ffd05")] }
```

### **▶️ Nest related filter queries :**

```javascript
await Book.findOne({
  author: {
    $in: {
      name: /.*Rowling$/
    }
  }
});
```

Result:

```
{ _id: ObjectID("606cbed349af304a1e828338"), title: "Harry Potter", author: ObjectID("606cbf3ac0680a044501108b") }
```

### **▶️ Populate results with a simple, expressive and powerful selection syntax :**

```javascript
await Book.findOne({ title: /.*Potter$/ }).select`
  {
    *,
    author {
      name
    }
  }
`;
```

Result:

```
{ _id: ObjectID("606cbed349af304a1e828338"), title: "Harry Potter", author: { name: "J.K. Rowling" } }
```

### **▶️ Populate and aggregate custom results :**

```javascript
await Author.findOne({ title: /.*Rowling$/ }).select`favoriteBooks name`;
```

Result:

```
["Emma"]
```

### **▶️ Cascade-delete related documents :**

```javascript
await Author.delete({ name: "Jane Austen" });
```

The **Book** and **Author** collections then respectively contain :

```
{ _id: ObjectID("606cbed349af304a1e828338"), title: "Harry Potter", author: ObjectID("606cbf3ac0680a044501108b") }
```

```
{ _id: ObjectID("606cbf3ac0680a044501108b"), name: "J.K. Rowling", favoriteBooks: [] }
```

📌 _By deleting the author "Jane Austen", her book "Emma" was deleted too, and so was its entry in J.K. Rowling's favorite book list._

## Other features

- The augmentation of the insertion or filter syntax to include relational stuff is a superset of the original syntax. **Everything written using the conventional syntax will work with Rongo**.
- You can opt-out the relational enhancements if you wish by playing with options, and just use Rongo as a regular MongoDB driver (like [mongoose](https://github.com/Automattic/mongoose), [monk](https://github.com/Automattic/monk), [mongoist](https://github.com/mongoist/mongoist), etc.). For example :

```javascript
await Author.delete({ name: "Jane Austen" }, { propagate: false });
```
