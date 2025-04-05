import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
env.config();
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let items = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Finish homework" },
];

app.get("/", async (req, res) => {
  try {
    const listsResult = await db.query("SELECT * FROM lists");
    const lists = listsResult.rows;

    for (let list of lists) {
      const itemsResult = await db.query("SELECT * FROM items WHERE list_id = $1 ORDER BY id ASC", [list.id]);
      list.items = itemsResult.rows;
    }

    res.render("index.ejs", {
      lists: lists,
      currentListType: req.query.listType || 'daily'
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/create-list", async (req, res) => {
  const { listName, listType } = req.body;

  try {
    await db.query("INSERT INTO lists (name, type) VALUES ($1, $2)", [listName, listType]);

    if (listType === 'weekly') {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const listResult = await db.query("SELECT id FROM lists WHERE name = $1 AND type = 'weekly'", [listName]);
      const listId = listResult.rows[0].id;
      
      for (let day of days) {
        await db.query("INSERT INTO items (title, list_id, day_of_week) VALUES ($1, $2, $3)", 
          [day + ' Tasks', listId, day]);
      }
    } 
    else if (listType === 'monthly') {
      const listResult = await db.query("SELECT id FROM lists WHERE name = $1 AND type = 'monthly'", [listName]);
      const listId = listResult.rows[0].id;
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        await db.query("INSERT INTO items (title, list_id, date_of_month) VALUES ($1, $2, $3)", 
          [`Day ${i} Tasks`, listId, i]);
      }
    }

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/add", async (req, res) => {
  const { newItem, listId } = req.body;

  try {
    await db.query("INSERT INTO items (title, list_id) VALUES ($1, $2)", [newItem, listId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit", async (req, res) => {
  const { updatedItemTitle, updatedItemId, listId } = req.body;

  try {
    await db.query(
      "UPDATE items SET title = $1 WHERE id = $2 AND list_id = $3",
      [updatedItemTitle, updatedItemId, listId]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating item");
  }
});

app.post("/delete", async (req, res) => {
  const { deleteItemId, listId } = req.body;

  try {
    await db.query("DELETE FROM items WHERE id = $1 AND list_id = $2", [deleteItemId, listId]);
    const remainingItems = await db.query("SELECT COUNT(*) FROM items WHERE list_id = $1", [listId]);

    if (parseInt(remainingItems.rows[0].count) === 0) {
      const listTypeResult = await db.query("SELECT type FROM lists WHERE id = $1", [listId]);
      const listType = listTypeResult.rows[0]?.type;

      if (listType === "weekly" || listType === "monthly") {
        await db.query("DELETE FROM lists WHERE id = $1", [listId]);
      }
    }

    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting item");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
