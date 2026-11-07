const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "books.db");

let db = null;

// Initialize SQLite database and Express server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create 'book' table if it doesn't already exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);

    // Seed initial records if empty
    const countResult = await db.get(`SELECT COUNT(*) as count FROM book`);
    if (countResult.count === 0) {
      await db.run(`
        INSERT INTO book (title, author, price) VALUES
          ('The Hobbit', 'J. R. R. Tolkien', 15.00),
          ('1984', 'George Orwell', 9.99),
          ('Pride and Prejudice', 'Jane Austen', 8.50),
          ('Clean Code', 'Robert C. Martin', 32.00),
          ('The Pragmatic Programmer', 'Andrew Hunt', 35.00),
          ('To Kill a Mockingbird', 'Harper Lee', 11.20)
      `);
      console.log("Database seeded with sample books.");
    }

    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error(`Database initialization error: ${error.message}`);
    process.exit(1);
  }
};

// 1. GET /books - Retrieve books with search, sort, filter, and pagination
app.get("/books", async (req, res) => {
  try {
    const {
      search_q = "",
      order_by = "title",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = req.query;

    // Validate price range if provided
    const minPrice = min_price !== undefined ? parseFloat(min_price) : 0;
    const maxPrice = max_price !== undefined ? parseFloat(max_price) : 999999;

    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return res.status(400).json({ message: "min_price and max_price must be numeric" });
    }

    // Validate sorting parameters against whitelist to prevent SQL injection
    const allowedOrderBy = ["id", "title", "author", "price"];
    const validOrderBy = allowedOrderBy.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : "title";

    const validOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    // Parameterized SQL query using LIKE and BETWEEN
    const getBooksQuery = `
      SELECT * FROM book
      WHERE title LIKE ? AND price BETWEEN ? AND ?
      ORDER BY ${validOrderBy} ${validOrder}
      LIMIT ? OFFSET ?
    `;

    const books = await db.all(getBooksQuery, [
      `%${search_q}%`,
      minPrice,
      maxPrice,
      parsedLimit,
      parsedOffset,
    ]);

    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. GET /books/:bookId - Retrieve a single book by id
app.get("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const getBookQuery = `SELECT * FROM book WHERE id = ?`;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. POST /books - Create a new book
app.post("/books", async (req, res) => {
  try {
    const { title, author, price } = req.body;

    // Validate POST body
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "title is required and cannot be empty" });
    }
    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({ message: "author is required and cannot be empty" });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ message: "price is required and must be a number" });
    }

    const numericPrice = Number(price);
    const insertBookQuery = `
      INSERT INTO book (title, author, price)
      VALUES (?, ?, ?)
    `;
    const result = await db.run(insertBookQuery, [
      title.trim(),
      author.trim(),
      numericPrice,
    ]);

    return res.status(201).json({
      message: "Book created successfully",
      bookId: result.lastID,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. PUT /books/:bookId - Update a book
app.put("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists
    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?`, [bookId]);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const { title, author, price } = req.body;

    // Validate update fields
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "title is required and cannot be empty" });
    }
    if (!author || typeof author !== "string" || author.trim() === "") {
      return res.status(400).json({ message: "author is required and cannot be empty" });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ message: "price is required and must be a number" });
    }

    const numericPrice = Number(price);
    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?
      WHERE id = ?
    `;
    await db.run(updateBookQuery, [
      title.trim(),
      author.trim(),
      numericPrice,
      bookId,
    ]);

    return res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. DELETE /books/:bookId - Delete a book
app.delete("/books/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?`, [bookId]);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?`;
    await db.run(deleteBookQuery, [bookId]);

    return res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, getDb: () => db };
