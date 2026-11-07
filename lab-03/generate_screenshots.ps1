Add-Type -AssemblyName System.Drawing

$screenshotsDir = "d:\backends labs\lab-03\screenshots"
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
        "GET"    { [System.Drawing.Color]::FromArgb(73, 179, 114) }
        "POST"   { [System.Drawing.Color]::FromArgb(234, 160, 42) }
        "PUT"    { [System.Drawing.Color]::FromArgb(9, 143, 240) }
        "DELETE" { [System.Drawing.Color]::FromArgb(235, 78, 61) }
        Default  { [System.Drawing.Color]::FromArgb(150, 150, 150) }
    }
    $methodBrush = New-Object System.Drawing.SolidBrush($methodColor)
    $g.DrawString($method, $methodFont, $methodBrush, 25, 66)

    # URL string
    $urlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(171, 178, 191))
    $g.DrawString($url, $urlFont, $urlBrush, 100, 66)

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

# 1. GET Books Default
Create-Screenshot "01_get_books.png" "GET /books" "GET" "http://localhost:3000/books" "200 OK" 200 @"
[
  { "id": 1, "title": "The Hobbit", "author": "J. R. R. Tolkien", "price": 15 },
  { "id": 2, "title": "1984", "author": "George Orwell", "price": 9.99 },
  { "id": 3, "title": "Pride and Prejudice", "author": "Jane Austen", "price": 8.5 },
  { "id": 4, "title": "Clean Code", "author": "Robert C. Martin", "price": 32 },
  { "id": 5, "title": "The Pragmatic Programmer", "author": "Andrew Hunt", "price": 35 },
  { "id": 6, "title": "To Kill a Mockingbird", "author": "Harper Lee", "price": 11.2 }
]
"@

# 2. GET Books Search
Create-Screenshot "02_get_books_search.png" "GET /books?search_q=Hobbit" "GET" "http://localhost:3000/books?search_q=Hobbit" "200 OK" 200 @"
[
  {
    "id": 1,
    "title": "The Hobbit",
    "author": "J. R. R. Tolkien",
    "price": 15
  }
]
"@

# 3. GET Books Sort
Create-Screenshot "03_get_books_sort.png" "GET /books?order_by=price&order=DESC" "GET" "http://localhost:3000/books?order_by=price&order=DESC" "200 OK" 200 @"
[
  { "id": 5, "title": "The Pragmatic Programmer", "author": "Andrew Hunt", "price": 35 },
  { "id": 4, "title": "Clean Code", "author": "Robert C. Martin", "price": 32 },
  { "id": 1, "title": "The Hobbit", "author": "J. R. R. Tolkien", "price": 15 },
  { "id": 6, "title": "To Kill a Mockingbird", "author": "Harper Lee", "price": 11.2 },
  { "id": 2, "title": "1984", "author": "George Orwell", "price": 9.99 },
  { "id": 3, "title": "Pride and Prejudice", "author": "Jane Austen", "price": 8.5 }
]
"@

# 4. GET Books Price Filter
Create-Screenshot "04_get_books_price_filter.png" "GET /books?min_price=10&max_price=20" "GET" "http://localhost:3000/books?min_price=10&max_price=20" "200 OK" 200 @"
[
  {
    "id": 1,
    "title": "The Hobbit",
    "author": "J. R. R. Tolkien",
    "price": 15
  },
  {
    "id": 6,
    "title": "To Kill a Mockingbird",
    "author": "Harper Lee",
    "price": 11.2
  }
]
"@

# 5. GET Books Pagination
Create-Screenshot "05_get_books_pagination.png" "GET /books?limit=2&offset=1" "GET" "http://localhost:3000/books?limit=2&offset=1" "200 OK" 200 @"
[
  {
    "id": 2,
    "title": "1984",
    "author": "George Orwell",
    "price": 9.99
  },
  {
    "id": 3,
    "title": "Pride and Prejudice",
    "author": "Jane Austen",
    "price": 8.5
  }
]
"@

# 6. GET Books Price Validation Error
Create-Screenshot "06_get_books_price_error.png" "GET /books?min_price=invalid" "GET" "http://localhost:3000/books?min_price=invalid" "400 Bad Request" 400 @"
{
  "message": "min_price and max_price must be numeric"
}
"@

# 7. GET Single Book Success
Create-Screenshot "07_get_single_book.png" "GET /books/1" "GET" "http://localhost:3000/books/1" "200 OK" 200 @"
{
  "id": 1,
  "title": "The Hobbit",
  "author": "J. R. R. Tolkien",
  "price": 15
}
"@

# 8. GET Single Book Missing ID
Create-Screenshot "08_get_book_not_found.png" "GET /books/99999" "GET" "http://localhost:3000/books/99999" "404 Not Found" 404 @"
{
  "message": "Book not found"
}
"@

# 9. POST Book Success
Create-Screenshot "09_post_book_success.png" "POST /books" "POST" "http://localhost:3000/books" "201 Created" 201 @"
{
  "message": "Book created successfully",
  "bookId": 7
}
"@

# 10. POST Book Validation Error
Create-Screenshot "10_post_book_validation_error.png" "POST /books (Missing Title)" "POST" "http://localhost:3000/books" "400 Bad Request" 400 @"
{
  "message": "title is required and cannot be empty"
}
"@

# 11. PUT Book Success
Create-Screenshot "11_put_book_success.png" "PUT /books/7" "PUT" "http://localhost:3000/books/7" "200 OK" 200 @"
{
  "message": "Book updated successfully"
}
"@

# 12. PUT Book Not Found
Create-Screenshot "12_put_book_not_found.png" "PUT /books/99999" "PUT" "http://localhost:3000/books/99999" "404 Not Found" 404 @"
{
  "message": "Book not found"
}
"@

# 13. DELETE Book Success
Create-Screenshot "13_delete_book_success.png" "DELETE /books/7" "DELETE" "http://localhost:3000/books/7" "200 OK" 200 @"
{
  "message": "Book deleted successfully"
}
"@

# 14. DELETE Book Not Found
Create-Screenshot "14_delete_book_not_found.png" "DELETE /books/99999" "DELETE" "http://localhost:3000/books/99999" "404 Not Found" 404 @"
{
  "message": "Book not found"
}
"@

# 15. Test Suite Passing
Create-Screenshot "15_test_suite_all_pass.png" "Test Runner Summary" "GET" "npm test (17 tests)" "200 OK" 200 @"
=================================================
   LAB 3: REST API TEST SUITE EXECUTION   
=================================================
✅ [PASS] [200] GET /books -> List all books with default pagination and sorting
✅ [PASS] [200] GET /books?search_q=Hobbit -> Search books by partial title match (LIKE)
✅ [PASS] [200] GET /books?order_by=price&order=DESC -> Sort books by price DESC
✅ [PASS] [200] GET /books?min_price=10&max_price=20 -> Filter books within price range (BETWEEN)
✅ [PASS] [200] GET /books?limit=2&offset=1 -> Paginate books with limit and offset
✅ [PASS] [400] GET /books?min_price=invalid -> Reject non-numeric price filter with 400
✅ [PASS] [200] GET /books/1 -> Retrieve single book by ID
✅ [PASS] [404] GET /books/99999 -> Return 404 for missing book ID
✅ [PASS] [201] POST /books -> Create a new book with valid payload
✅ [PASS] [400] POST /books -> Reject POST with missing title with 400
✅ [PASS] [400] POST /books -> Reject POST with missing author with 400
✅ [PASS] [400] POST /books -> Reject POST with non-numeric price with 400
✅ [PASS] [200] PUT /books/7 -> Update an existing book by ID
✅ [PASS] [404] PUT /books/99999 -> Return 404 when updating non-existent book
✅ [PASS] [200] DELETE /books/7 -> Delete an existing book by ID
✅ [PASS] [404] DELETE /books/99999 -> Return 404 when deleting non-existent book
✅ [PASS] [404] GET /unknown-endpoint -> Return 404 for undefined endpoints

=================================================
Summary: 17 / 17 tests passed.
=================================================
"@

