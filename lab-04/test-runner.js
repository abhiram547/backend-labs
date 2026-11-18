// Test runner for Lab 4 Authentication & JWT API
const http = require("http");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { app, initializeDBAndServer, getDb, JWT_SECRET } = require("./server");

process.env.NODE_ENV = "test";
const TEST_PORT = 3200;

function makeRequest(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const options = {
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: reqPath,
      method: method,
      headers: headers,
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

  await new Promise((resolve) => server.once("listening", resolve));

  console.log("=================================================");
  console.log("   LAB 4: AUTHENTICATION & JWT TEST SUITE        ");
  console.log("=================================================\n");

  const results = [];
  let receivedToken = null;

  async function test(name, method, reqPath, body, expectedStatus, validator, token = null) {
    try {
      const response = await makeRequest(method, reqPath, body, token);
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

  // 1. POST /register (Success)
  await test(
    "Register a new user successfully",
    "POST",
    "/register",
    {
      username: "abhiram_sure",
      name: "Sure Abhiram",
      password: "password123",
    },
    200,
    (data) => data.message === "User created successfully"
  );

  // 2. POST /register (Duplicate username - Failure 400)
  await test(
    "Reject duplicate username with 400",
    "POST",
    "/register",
    {
      username: "abhiram_sure",
      name: "Duplicate User",
      password: "password123",
    },
    400,
    (data) => data.message === "User already exists"
  );

  // 3. POST /register (Missing username - Failure 400)
  await test(
    "Reject registration missing username with 400",
    "POST",
    "/register",
    {
      name: "No Username",
      password: "password123",
    },
    400,
    (data) => data.message && typeof data.message === "string"
  );

  // 4. POST /register (Short password - Failure 400)
  await test(
    "Reject registration with short password with 400",
    "POST",
    "/register",
    {
      username: "short_pwd_user",
      name: "Short Pwd",
      password: "123",
    },
    400,
    (data) => data.message === "Password is too short"
  );

  // 5. POST /login (Success 200 - Returns JWT)
  const loginRes = await test(
    "Login successfully and receive JWT token",
    "POST",
    "/login",
    {
      username: "abhiram_sure",
      password: "password123",
    },
    200,
    (data) => typeof data.jwt_token === "string" && data.jwt_token.length > 20
  );

  if (loginRes && loginRes.data && loginRes.data.jwt_token) {
    receivedToken = loginRes.data.jwt_token;
  }

  // 6. POST /login (Unknown user - Failure 400)
  await test(
    "Reject unknown user with 400",
    "POST",
    "/login",
    {
      username: "non_existent_user",
      password: "password123",
    },
    400,
    (data) => data.message === "Invalid user"
  );

  // 7. POST /login (Wrong password - Failure 400)
  await test(
    "Reject incorrect password with 400",
    "POST",
    "/login",
    {
      username: "abhiram_sure",
      password: "wrong_password",
    },
    400,
    (data) => data.message === "Invalid password"
  );

  // 8. POST /login (Missing credentials - Failure 400)
  await test(
    "Reject login missing credentials with 400",
    "POST",
    "/login",
    {},
    400,
    (data) => data.message && typeof data.message === "string"
  );

  // 9. Verify JWT Token Payload (Never contains password)
  if (receivedToken) {
    const decoded = jwt.decode(receivedToken, { complete: true });
    const hasUsername = decoded.payload && decoded.payload.username === "abhiram_sure";
    const noPassword = decoded.payload && decoded.payload.password === undefined;
    const hasHeader = decoded.header && decoded.header.alg === "HS256";
    const passedTokenCheck = hasUsername && noPassword && hasHeader;

    console.log(
      `${passedTokenCheck ? "✅ [PASS]" : "❌ [FAIL]"} [JWT] Verify Token: contains username and excludes password`
    );
    results.push({
      name: "Verify JWT Payload security (no password, valid username)",
      method: "JWT_DECODE",
      path: "jwt.decode",
      status: 200,
      expectedStatus: 200,
      passed: passedTokenCheck,
      response: {
        header: decoded.header,
        payload: decoded.payload,
      },
    });
  }

  // 10. Database Hashing Check (Password column contains bcrypt hash, not plain text)
  const db = getDb();
  const dbUser = await db.get(`SELECT * FROM user WHERE username = ?`, ["abhiram_sure"]);
  const isHashed = dbUser && dbUser.password.startsWith("$2b$") && dbUser.password !== "password123";
  console.log(
    `${isHashed ? "✅ [PASS]" : "❌ [FAIL]"} [DB] Verify Password is saved as bcrypt hash in SQLite`
  );
  results.push({
    name: "Verify database stores bcrypt hash only",
    method: "DB_CHECK",
    path: "user.password",
    status: 200,
    expectedStatus: 200,
    passed: isHashed,
    response: {
      username: dbUser.username,
      hashedSample: dbUser.password.substring(0, 20) + "...",
    },
  });

  // 11. GET /profile (Protected route with valid token - Success 200)
  if (receivedToken) {
    await test(
      "Access protected route with valid JWT Bearer token",
      "GET",
      "/profile",
      null,
      200,
      (data) => data.username === "abhiram_sure",
      receivedToken
    );
  }

  // 12. GET /profile (Protected route without token - Failure 401)
  await test(
    "Reject protected route without token with 401",
    "GET",
    "/profile",
    null,
    401,
    (data) => data.message === "Invalid JWT Token"
  );

  // 13. GET /profile (Protected route with invalid token - Failure 401)
  await test(
    "Reject protected route with invalid token with 401",
    "GET",
    "/profile",
    null,
    401,
    (data) => data.message === "Invalid JWT Token",
    "invalid_token_sample"
  );

  // 14. Unknown route (Failure 404)
  await test(
    "Reject unknown route with 404",
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
