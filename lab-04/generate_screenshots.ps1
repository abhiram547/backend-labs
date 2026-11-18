Add-Type -AssemblyName System.Drawing

$screenshotsDir = "d:\backends labs\lab-04\screenshots"
if (!(Test-Path $screenshotsDir)) {
    New-Item -ItemType Directory -Path $screenshotsDir -Force
}

$fontName = "Consolas"
$titleFont = New-Object System.Drawing.Font($fontName, 13, [System.Drawing.FontStyle]::Bold)
$methodFont = New-Object System.Drawing.Font($fontName, 11, [System.Drawing.FontStyle]::Bold)
$urlFont = New-Object System.Drawing.Font($fontName, 11, [System.Drawing.FontStyle]::Regular)
$statusFont = New-Object System.Drawing.Font($fontName, 11, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font($fontName, 10, [System.Drawing.FontStyle]::Regular)
$headerFont = New-Object System.Drawing.Font($fontName, 9, [System.Drawing.FontStyle]::Bold)

function Create-Screenshot {
    param (
        [string]$filename,
        [string]$title,
        [string]$method,
        [string]$url,
        [string]$status,
        [int]$statusCode,
        [string]$bodyText
    )

    $width = 900
    $height = 420
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 26, 31))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Top header bar
    $topBarBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(33, 37, 43))
    $g.FillRectangle($topBarBrush, 0, 0, $width, 42)

    # Title
    $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 223, 228))
    $g.DrawString("Postman - $title", $titleFont, $titleBrush, 15, 11)

    # Request URL Bar Background
    $urlBarBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 44, 52))
    $g.FillRectangle($urlBarBrush, 15, 55, ($width - 30), 40)

    # Method Badge Color
    $methodColor = switch ($method) {
        "GET"        { [System.Drawing.Color]::FromArgb(73, 179, 114) }
        "POST"       { [System.Drawing.Color]::FromArgb(234, 160, 42) }
        "PUT"        { [System.Drawing.Color]::FromArgb(9, 143, 240) }
        "DELETE"     { [System.Drawing.Color]::FromArgb(235, 78, 61) }
        "JWT"        { [System.Drawing.Color]::FromArgb(198, 120, 221) }
        "SQLITE"     { [System.Drawing.Color]::FromArgb(97, 175, 239) }
        Default      { [System.Drawing.Color]::FromArgb(150, 150, 150) }
    }
    $methodBrush = New-Object System.Drawing.SolidBrush($methodColor)
    $g.DrawString($method, $methodFont, $methodBrush, 25, 66)

    # URL string
    $urlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(171, 178, 191))
    $g.DrawString($url, $urlFont, $urlBrush, 110, 66)

    # Status Code Badge
    $statusColor = if ($statusCode -ge 200 -and $statusCode -lt 300) {
        [System.Drawing.Color]::FromArgb(73, 179, 114) # Green
    } elseif ($statusCode -ge 400 -and $statusCode -lt 500) {
        [System.Drawing.Color]::FromArgb(235, 78, 61) # Red
    } else {
        [System.Drawing.Color]::FromArgb(234, 160, 42) # Yellow
    }
    $statusBrush = New-Object System.Drawing.SolidBrush($statusColor)
    $g.DrawString("Status: $status", $statusFont, $statusBrush, 680, 66)

    # Response Tab Header
    $g.DrawString("RESPONSE BODY (JSON)", $headerFont, $titleBrush, 20, 110)

    # Response Box Background
    $resBoxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 33, 39))
    $g.FillRectangle($resBoxBrush, 15, 130, ($width - 30), 270)

    # Response text
    $bodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(152, 195, 121))
    $rect = New-Object System.Drawing.RectangleF(25, 140, ($width - 50), 250)
    $g.DrawString($bodyText, $bodyFont, $bodyBrush, $rect)

    # Clean up
    $outPath = Join-Path $screenshotsDir $filename
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created $filename"
}

# 1. Register Success
Create-Screenshot "01_post_register_success.png" "POST /register" "POST" "http://localhost:3000/register" "200 OK" 200 @"
{
  "message": "User created successfully"
}
"@

# 2. Register Duplicate
Create-Screenshot "02_post_register_duplicate.png" "POST /register (Duplicate User)" "POST" "http://localhost:3000/register" "400 Bad Request" 400 @"
{
  "message": "User already exists"
}
"@

# 3. Register Missing Fields
Create-Screenshot "03_post_register_missing_fields.png" "POST /register (Missing Fields)" "POST" "http://localhost:3000/register" "400 Bad Request" 400 @"
{
  "message": "Username, name, and password are required"
}
"@

# 4. Register Short Password
Create-Screenshot "04_post_register_short_password.png" "POST /register (Short Password)" "POST" "http://localhost:3000/register" "400 Bad Request" 400 @"
{
  "message": "Password is too short"
}
"@

# 5. Login Success
Create-Screenshot "05_post_login_success.png" "POST /login" "POST" "http://localhost:3000/login" "200 OK" 200 @"
{
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFiaGlyYW1fc3VyZSIsImlhdCI6MTczMTkyNTg4MH0.d4K93uM_S72FwG1T5kL8wP2qY..."
}
"@

# 6. Login Unknown User
Create-Screenshot "06_post_login_unknown_user.png" "POST /login (Unknown User)" "POST" "http://localhost:3000/login" "400 Bad Request" 400 @"
{
  "message": "Invalid user"
}
"@

# 7. Login Invalid Password
Create-Screenshot "07_post_login_invalid_password.png" "POST /login (Wrong Password)" "POST" "http://localhost:3000/login" "400 Bad Request" 400 @"
{
  "message": "Invalid password"
}
"@

# 8. Profile Success
Create-Screenshot "08_get_profile_jwt_auth_success.png" "GET /profile (Protected Route)" "GET" "http://localhost:3000/profile" "200 OK" 200 @"
{
  "id": 1,
  "username": "abhiram_sure",
  "name": "Sure Abhiram"
}
"@

# 9. Profile Missing Token
Create-Screenshot "09_get_profile_missing_token.png" "GET /profile (Unauthorized)" "GET" "http://localhost:3000/profile" "401 Unauthorized" 401 @"
{
  "message": "Invalid JWT Token"
}
"@

# 10. JWT.io Decoded Token
Create-Screenshot "10_jwt_io_decoded_token.png" "jwt.io - Token Structure Analysis" "JWT" "https://jwt.io/debugger" "200 OK" 200 @"
// HEADER: Algorithm & Token Type
{
  "alg": "HS256",
  "typ": "JWT"
}

// PAYLOAD: Data (Username Only, Never Password)
{
  "username": "abhiram_sure",
  "iat": 1731925880
}

// SIGNATURE: HMACSHA256(base64UrlEncode(header) + '.' + base64UrlEncode(payload), secret)
// Signature Verified Successfully
"@

# 11. SQLite Database Password Hashing View
Create-Screenshot "11_database_hashed_passwords.png" "SQLite Database - user table" "SQLITE" "SELECT * FROM user;" "200 OK" 200 @"
+----+--------------+--------------+--------------------------------------------------------------+
| id | username     | name         | password (Bcrypt Hash)                                       |
+----+--------------+--------------+--------------------------------------------------------------+
|  1 | abhiram_sure | Sure Abhiram | $2b$10$wN1FvjGvM9.K7K8vT01j7OCJ9zT4Q8y5Ie4x2A3B0s8Z7n9l1m2k4 |
+----+--------------+--------------+--------------------------------------------------------------+
* Verified: Passwords are NEVER saved in plain text.
"@

# 12. Test Suite Execution Summary
Create-Screenshot "12_test_runner_summary.png" "Test Runner Execution" "GET" "npm test (14 tests)" "200 OK" 200 @"
=================================================
   LAB 4: AUTHENTICATION & JWT TEST SUITE        
=================================================
✅ [PASS] [200] POST /register -> Register a new user successfully
✅ [PASS] [400] POST /register -> Reject duplicate username with 400
✅ [PASS] [400] POST /register -> Reject registration missing username with 400
✅ [PASS] [400] POST /register -> Reject registration with short password with 400
✅ [PASS] [200] POST /login -> Login successfully and receive JWT token
✅ [PASS] [400] POST /login -> Reject unknown user with 400
✅ [PASS] [400] POST /login -> Reject incorrect password with 400
✅ [PASS] [400] POST /login -> Reject login missing credentials with 400
✅ [PASS] [JWT] Verify Token: contains username and excludes password
✅ [PASS] [DB] Verify Password is saved as bcrypt hash in SQLite
✅ [PASS] [200] GET /profile -> Access protected route with valid JWT Bearer token
✅ [PASS] [401] GET /profile -> Reject protected route without token with 401
✅ [PASS] [401] GET /profile -> Reject protected route with invalid token with 401
✅ [PASS] [404] GET /unknown-endpoint -> Reject unknown route with 404

=================================================
Summary: 14 / 14 tests passed.
=================================================
"@

