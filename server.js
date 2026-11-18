// Root Unified Server for Backend Labs (Serves both Lab 3 and Lab 4)
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Import lab-03 and lab-04 app instances
const lab03 = require("./lab-03/server");
const lab04 = require("./lab-04/server");

// Root Overview
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Backend Development Fundamentals - Live API Server",
    student: "SURE ABHIRAM",
    roll_number: "252U1R1234",
    section: "CSE-2E-211",
    faculty: "Yugandhar",
    status: "Online",
    available_labs: {
      lab_03_books_api: {
        get_all_books: "GET /books",
        search_by_title: "GET /books?search_q=Hobbit",
        sort_by_price: "GET /books?order_by=price&order=DESC",
        price_filter: "GET /books?min_price=10&max_price=20",
        get_single_book: "GET /books/1",
        create_book: "POST /books",
        update_book: "PUT /books/:id",
        delete_book: "DELETE /books/:id",
      },
      lab_04_auth_jwt: {
        register_user: "POST /register (or open in browser for schema)",
        login_user: "POST /login (or open in browser for schema)",
        protected_profile: "GET /profile (Requires Bearer token)",
      },
    },
  });
});

// Initialize both databases and start unified server
const startUnifiedServer = async () => {
  try {
    await lab03.initializeDBAndServer();
    await lab04.initializeDBAndServer();

    // Mount Lab 3 routes
    app.use(lab03.app);

    // Mount Lab 4 routes
    app.use(lab04.app);

    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Unified Backend Labs Server running at http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error(`Unified Server Error: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startUnifiedServer();
}

module.exports = { app, startUnifiedServer };
