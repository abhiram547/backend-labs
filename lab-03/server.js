const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "books.db");
const JWT_SECRET = "MY_SECRET_TOKEN";

let db = null;

// Initialize SQLite database and Express server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create 'book' table if it doesn't already exist (Lab 3)
    await db.run(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);

    // Create 'user' table if it doesn't already exist (Lab 4)
    await db.run(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL
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

// Root endpoint: lists all available endpoints
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Backend Development Fundamentals - Live API Server",
    student: "SURE ABHIRAM",
    roll_number: "252U1R1234",
    section: "CSE-2E-211",
    faculty: "Yugandhar",
    status: "Online",
    available_endpoints: {
      lab_03_books: {
        get_books: "GET /books",
        search_books: "GET /books?search_q=Hobbit",
        sort_books: "GET /books?order_by=price&order=DESC",
        filter_price: "GET /books?min_price=10&max_price=20",
        single_book: "GET /books/1",
        create_book: "POST /books",
        update_book: "PUT /books/:id",
        delete_book: "DELETE /books/:id",
      },
      lab_04_auth: {
        register: "POST /register (or open in browser for schema)",
        login: "POST /login (or open in browser for schema)",
        profile: "GET /profile (Requires Bearer token)",
      },
    },
  });
});

// ==========================================
// LAB 3 ROUTES: /books
// ==========================================

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

    const minPrice = min_price !== undefined ? parseFloat(min_price) : 0;
    const maxPrice = max_price !== undefined ? parseFloat(max_price) : 999999;

    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return res.status(400).json({ message: "min_price and max_price must be numeric" });
    }

    const allowedOrderBy = ["id", "title", "author", "price"];
    const validOrderBy = allowedOrderBy.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : "title";

    const validOrder = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

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
    const { title, author, price } = req.body || {};

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
    const insertBookQuery = `INSERT INTO book (title, author, price) VALUES (?, ?, ?)`;
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

    const existingBook = await db.get(`SELECT * FROM book WHERE id = ?`, [bookId]);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const { title, author, price } = req.body || {};

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

// ==========================================
// LAB 4 ROUTES: /register, /login, /profile
// ==========================================

// Browser GET helper for /register
const handleRegisterInfo = (req, res) => {
  res.status(200).json({
    endpoint: "POST /register",
    method: "POST",
    description: "User Registration Endpoint. To register a user, send an HTTP POST request with JSON body using Postman or curl.",
    sample_request_body: {
      username: "abhiram_sure",
      name: "Sure Abhiram",
      password: "password123",
    },
    note: "Browser address bars send GET requests. Please send a POST request with JSON body to register.",
  });
};

app.get("/register", handleRegisterInfo);
app.get("/register/", handleRegisterInfo);

// POST /register
const handleRegister = async (req, res) => {
  try {
    const { username, name, password } = req.body || {};

    if (!username || !name || !password) {
      return res.status(400).json({ message: "Username, name, and password are required" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password is too short" });
    }

    const selectUserQuery = `SELECT * FROM user WHERE username = ?`;
    const existingUser = await db.get(selectUserQuery, [username]);

    if (existingUser !== undefined) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = `INSERT INTO user (username, name, password) VALUES (?, ?, ?)`;
    await db.run(insertUserQuery, [username, name, hashedPassword]);

    return res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

app.post("/register", handleRegister);
app.post("/register/", handleRegister);

// Browser GET helper for /login
const handleLoginInfo = (req, res) => {
  res.status(200).json({
    endpoint: "POST /login",
    method: "POST",
    description: "User Login Endpoint. To log in and receive a JWT token, send an HTTP POST request with JSON body using Postman or curl.",
    sample_request_body: {
      username: "abhiram_sure",
      password: "password123",
    },
    note: "Browser address bars send GET requests. Please send a POST request with JSON body to login and receive your jwt_token.",
  });
};

app.get("/login", handleLoginInfo);
app.get("/login/", handleLoginInfo);

// POST /login
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const selectUserQuery = `SELECT * FROM user WHERE username = ?`;
    const dbUser = await db.get(selectUserQuery, [username]);

    if (dbUser === undefined) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordMatched) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const payload = { username: dbUser.username };
    const jwt_token = jwt.sign(payload, JWT_SECRET);

    return res.status(200).json({ jwt_token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

app.post("/login", handleLogin);
app.post("/login/", handleLogin);

// GET /profile
app.get("/profile", async (req, res) => {
  const authHeader = req.headers["authorization"];
  let jwtToken = null;

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined || jwtToken === null) {
    return res.status(401).json({ message: "Invalid JWT Token" });
  }

  jwt.verify(jwtToken, JWT_SECRET, async (error, payload) => {
    if (error) {
      return res.status(401).json({ message: "Invalid JWT Token" });
    }
    const selectUserQuery = `SELECT id, username, name FROM user WHERE username = ?`;
    const user = await db.get(selectUserQuery, [payload.username]);
    return res.status(200).json(user);
  });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, getDb: () => db };
