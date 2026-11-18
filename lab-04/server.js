const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "users.db");

// Secret key stored in a constant for now (moved to .env in Lab 8)
const JWT_SECRET = "MY_SECRET_TOKEN";

let db = null;

// Initialize SQLite database and Express server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create user table with unique username, name, and password hash
    await db.run(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Seed sample users if database is empty
    const countResult = await db.get(`SELECT COUNT(*) as count FROM user`);
    if (countResult.count === 0) {
      const hash1 = await bcrypt.hash("password123", 10);
      const hash2 = await bcrypt.hash("rahul@123", 10);
      const hash3 = await bcrypt.hash("faculty123", 10);

      await db.run(
        `INSERT INTO user (username, name, password) VALUES 
          ('abhiram_sure', 'Sure Abhiram', ?),
          ('rahul_sharma', 'Rahul Sharma', ?),
          ('yugandhar_faculty', 'Yugandhar', ?)`,
        [hash1, hash2, hash3]
      );
      console.log("Database seeded with sample users.");
    }

    console.log("Database initialized and 'user' table ready.");

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

// Root endpoint: displays API overview and sample test accounts
app.get("/", (req, res) => {
  res.status(200).json({
    project: "Lab 4: Registration, login and JWT",
    student: "SURE ABHIRAM",
    roll_number: "252U1R1234",
    section: "CSE-2E-211",
    faculty: "Yugandhar",
    status: "Active and Running",
    sample_test_credentials: {
      username: "abhiram_sure",
      password: "password123",
      note: "Pre-seeded in database. Use these credentials in POST /login to receive a JWT token instantly.",
    },
    endpoints: {
      users_list: {
        method: "GET",
        path: "/users",
        description: "View all registered sample users in the database",
      },
      register: {
        method: "POST",
        path: "/register",
        description: "Register a new user with hashed password",
        sample_body: {
          username: "new_student",
          name: "New Student",
          password: "mypassword123",
        },
      },
      login: {
        method: "POST",
        path: "/login",
        description: "Login with credentials to receive a signed JWT token",
        sample_body: {
          username: "abhiram_sure",
          password: "password123",
        },
      },
      profile: {
        method: "GET",
        path: "/profile",
        description: "Protected route requiring 'Authorization: Bearer <jwt_token>' header",
      },
    },
  });
});

// GET /users - View all registered users (passwords excluded for security)
app.get("/users", async (req, res) => {
  try {
    const users = await db.all(`SELECT id, username, name FROM user`);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Browser GET helper for /register
const handleRegisterInfo = (req, res) => {
  res.status(200).json({
    endpoint: "POST /register",
    method: "POST",
    description: "User Registration Endpoint. To register a user, send an HTTP POST request with JSON body using Postman or curl.",
    sample_request_body: {
      username: "new_user_123",
      name: "Sample User",
      password: "password123",
    },
    pre_seeded_users: [
      { username: "abhiram_sure", password: "password123" },
      { username: "rahul_sharma", password: "rahul@123" },
    ],
    note: "Browser address bars send GET requests. Send a POST request with JSON body in Postman to register a new user.",
  });
};

app.get("/register", handleRegisterInfo);
app.get("/register/", handleRegisterInfo);

// 1. POST /register - Register a new user
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
    const insertUserQuery = `
      INSERT INTO user (username, name, password)
      VALUES (?, ?, ?)
    `;
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
    sample_ready_to_use_credentials: {
      username: "abhiram_sure",
      password: "password123",
    },
    instructions: "Send a POST request in Postman with the above credentials to receive your jwt_token immediately.",
  });
};

app.get("/login", handleLoginInfo);
app.get("/login/", handleLoginInfo);

// 2. POST /login - Authenticate user and return JWT
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

    // Put ONLY the username (never the password) into the JWT payload
    const payload = {
      username: dbUser.username,
    };

    const jwt_token = jwt.sign(payload, JWT_SECRET);

    return res.status(200).json({ jwt_token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

app.post("/login", handleLogin);
app.post("/login/", handleLogin);

// 3. GET /profile - Protected route to verify JWT token and demonstrate authentication
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

module.exports = { app, initializeDBAndServer, getDb: () => db, JWT_SECRET };
