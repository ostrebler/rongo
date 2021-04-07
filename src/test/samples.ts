import { DeletePolicy, Graph, InsertPolicy, ObjectId, Rongo } from "../.";

// The main test database

export const rongo = new Rongo("mongodb://localhost:27017/rongo_test");
rongo.schema("./src/test/schema.test.json");

// Some types for TS testing

export type UserDb = {
  _id: ObjectId;
  name: string;
  age: number;
};

export type ListDb = {
  _id: ObjectId;
  title: string;
  users: Array<ObjectId>;
};

export type TaskDb = {
  _id: ObjectId;
  label: string;
  list: ObjectId;
  createdBy: ObjectId;
  edits: Array<{
    user: ObjectId;
    date: string;
  }>;
  assignedTo: Array<{
    user: ObjectId;
    priority: number;
  }>;
};

// Some test collections :

export const User = rongo.collection<UserDb>("User");
export const List = rongo.collection<ListDb>("List");
export const Task = rongo.collection<TaskDb>("Task");

// Populate the test collections with example :

export async function populateTest() {
  await rongo.drop();
  const [bob, freddy, hans] = await User.insert([
    {
      name: "Bob",
      age: 46
    },
    {
      name: "Freddy",
      age: 54
    },
    {
      name: "Hans",
      age: 27
    }
  ]);
}

// The full graph that should be calculated for the test database :

export const graph: Graph = {
  List: {
    key: "_id",
    foreignKeys: {
      users: {
        path: ["users", "$"],
        collection: "User",
        optional: false,
        nullable: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Pull
      }
    },
    references: {
      Task: {
        list: {
          path: ["list"],
          collection: "List",
          optional: false,
          nullable: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Delete
        }
      }
    }
  },
  User: {
    key: "_id",
    foreignKeys: {},
    references: {
      List: {
        users: {
          path: ["users", "$"],
          collection: "User",
          optional: false,
          nullable: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Pull
        }
      },
      Task: {
        createdBy: {
          path: ["createdBy"],
          collection: "User",
          optional: false,
          nullable: true,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Nullify
        },
        "edits.user": {
          path: ["edits", "$", "user"],
          collection: "User",
          optional: true,
          nullable: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Unset
        },
        "assignedTo.user": {
          path: ["assignedTo", "$", "user"],
          collection: "User",
          optional: false,
          nullable: false,
          onInsert: InsertPolicy.Verify,
          onDelete: DeletePolicy.Pull
        }
      }
    }
  },
  Task: {
    key: "_id",
    foreignKeys: {
      list: {
        path: ["list"],
        collection: "List",
        optional: false,
        nullable: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Delete
      },
      createdBy: {
        path: ["createdBy"],
        collection: "User",
        optional: false,
        nullable: true,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Nullify
      },
      "edits.user": {
        path: ["edits", "$", "user"],
        collection: "User",
        optional: true,
        nullable: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Unset
      },
      "assignedTo.user": {
        path: ["assignedTo", "$", "user"],
        collection: "User",
        optional: false,
        nullable: false,
        onInsert: InsertPolicy.Verify,
        onDelete: DeletePolicy.Pull
      }
    },
    references: {}
  }
};
