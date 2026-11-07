// Test runner for Lab 3 REST API
const http = require("http");
const path = require("path");
const fs = require("fs");
const { app, initializeDBAndServer } = require("./server");

process.env.NODE_ENV = "test";
const TEST_PORT = 3100;

function makeRequest(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: reqPath,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  await initializeDBAndServer();
  const server = app.listen(TEST_PORT, "127.0.0.1");

  // Wait a moment for server to listen
  await new Promise((resolve) => server.once("listening", resolve));

  console.log("=================================================");
  console.log("   LAB 3: REST API TEST SUITE EXECUTION   ");
  console.log("=================================================\n");

  const results = [];
  let createdBookId = null;

  async function test(name, method, reqPath, body, expectedStatus, validator) {
    try {
      const response = await makeRequest(method, reqPath, body);
      const passed =
        response.status === expectedStatus &&
        (validator ? validator(response.data) : true);

      results.push({
        name,
        method,
        path: reqPath,
        status: response.status,
        expectedStatus,
        passed,
        response: response.data,
      });

      console.log(
        `${passed ? "✅ [PASS]" : "❌ [FAIL]"} [${response.status}] ${method} ${reqPath} -> ${name}`
      );
      if (!passed) {
        console.log(`   Expected: ${expectedStatus}, Received: ${response.status}`);
        console.log(`   Response:`, response.data);
      }
      return response;
    } catch (err) {
      console.log(`❌ [ERROR] ${method} ${reqPath} -> ${err.message}`);
      results.push({
        name,
        method,
        path: reqPath,
        status: "ERROR",
        expectedStatus,
        passed: false,
        error: err.message,
      });
    }
  }

  // 1. GET /books (Default)
  await test(
    "List all books with default pagination and sorting",
    "GET",
    "/books",
    null,
    200,
    (data) => Array.isArray(data) && data.length > 0
  );

  // 2. GET /books?search_q=Hobbit
  await test(
    "Search books by partial title match (LIKE)",
    "GET",
    "/books?search_q=Hobbit",
    null,
    200,
    (data) => Array.isArray(data) && data.length >= 1 && data.every((b) => b.title.includes("Hobbit"))
  );

  // 3. GET /books?order_by=price&order=DESC
  await test(
    "Sort books by price DESC",
    "GET",
    "/books?order_by=price&order=DESC",
    null,
    200,
    (data) => Array.isArray(data) && data[0].price >= data[1].price
  );

  // 4. GET /books?min_price=10&max_price=20 (BETWEEN filter)
  await test(
    "Filter books within price range (BETWEEN)",
    "GET",
    "/books?min_price=10&max_price=20",
    null,
    200,
    (data) => Array.isArray(data) && data.every((b) => b.price >= 10 && b.price <= 20)
  );

  // 5. GET /books?limit=2&offset=1 (Pagination)
  await test(
    "Paginate books with limit and offset",
    "GET",
    "/books?limit=2&offset=1",
    null,
    200,
    (data) => Array.isArray(data) && data.length === 2
  );

  // 6. GET /books?min_price=invalid (Validation error)
  await test(
    "Reject non-numeric price filter with 400",
    "GET",
    "/books?min_price=invalid",
    null,
    400,
    (data) => data.message && typeof data.message === "string"
  );

  // 7. GET /books/1 (Single record by ID)
  await test(
    "Retrieve single book by ID",
    "GET",
    "/books/1",
    null,
    200,
    (data) => data.id === 1
  );

  // 8. GET /books/99999 (Non-existent ID)
  await test(
    "Return 404 for missing book ID",
    "GET",
    "/books/99999",
    null,
    404,
    (data) => data.message === "Book not found"
  );

  // 9. POST /books (Create valid book)
  const postRes = await test(
    "Create a new book with valid payload",
    "POST",
    "/books",
    {
      title: "Design Patterns",
      author: "Erich Gamma",
      price: 45.0,
    },
    201,
    (data) => data.bookId && data.message
  );
  if (postRes && postRes.data && postRes.data.bookId) {
    createdBookId = postRes.data.bookId;
  }

  // 10. POST /books (Missing title)
  await test(
    "Reject POST with missing title with 400",
    "POST",
    "/books",
    { author: "Author Only", price: 20 },
    400,
    (data) => data.message
  );

  // 11. POST /books (Missing author)
  await test(
    "Reject POST with missing author with 400",
    "POST",
    "/books",
    { title: "Title Only", price: 20 },
    400,
    (data) => data.message
  );

  // 12. POST /books (Non-numeric price)
  await test(
    "Reject POST with non-numeric price with 400",
    "POST",
    "/books",
    { title: "Book", author: "Author", price: "free" },
    400,
    (data) => data.message
  );

  // 13. PUT /books/:id (Update existing book)
  if (createdBookId) {
    await test(
      "Update an existing book by ID",
      "PUT",
      `/books/${createdBookId}`,
      {
        title: "Design Patterns (Updated)",
        author: "Gang of Four",
        price: 49.99,
      },
      200,
      (data) => data.message === "Book updated successfully"
    );
  }

  // 14. PUT /books/99999 (Update non-existent book)
  await test(
    "Return 404 when updating non-existent book",
    "PUT",
    "/books/99999",
    { title: "No Book", author: "Ghost", price: 10 },
    404,
    (data) => data.message === "Book not found"
  );

  // 15. DELETE /books/:id (Delete existing book)
  if (createdBookId) {
    await test(
      "Delete an existing book by ID",
      "DELETE",
      `/books/${createdBookId}`,
      null,
      200,
      (data) => data.message === "Book deleted successfully"
    );
  }

  // 16. DELETE /books/99999 (Delete non-existent book)
  await test(
    "Return 404 when deleting non-existent book",
    "DELETE",
    "/books/99999",
    null,
    404,
    (data) => data.message === "Book not found"
  );

  // 17. Unknown route
  await test(
    "Return 404 for undefined endpoints",
    "GET",
    "/unknown-endpoint",
    null,
    404,
    (data) => data.message === "Route not found"
  );

  server.close();

  const totalPassed = results.filter((r) => r.passed).length;
  console.log("\n=================================================");
  console.log(`Summary: ${totalPassed} / ${results.length} tests passed.`);
  console.log("=================================================\n");

  fs.writeFileSync(
    path.join(__dirname, "test-results.json"),
    JSON.stringify(results, null, 2)
  );

  if (totalPassed === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
