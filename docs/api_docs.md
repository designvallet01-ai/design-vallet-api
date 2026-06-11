# Design Vallet - API Documentation

The backend service runs by default on `http://localhost:5000` (or local development address). All authenticated endpoints require a JSON Web Token (JWT) in the header as follows:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints (`/api/auth`)

### Post Signup
* **URL:** `/api/auth/signup`
* **Method:** `POST`
* **Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "yourpassword123",
  "full_name": "Jane Doe",
  "phone_number": "+919999988888"
}
```
* **Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 2,
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "is_admin": false
  }
}
```

### Post Login
* **URL:** `/api/auth/login`
* **Method:** `POST`
* **Request Body:**
```json
{
  "email": "admin@designvallet.com",
  "password": "adminpassword123"
}
```
* **Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "email": "admin@designvallet.com",
    "full_name": "System Admin",
    "is_admin": true
  }
}
```

### Request SMS OTP
* **URL:** `/api/auth/otp/request`
* **Method:** `POST`
* **Request Body:**
```json
{
  "phone_number": "+919999988888"
}
```
* **Response (200 OK):**
```json
{
  "message": "OTP sent successfully (Simulated)",
  "phone_number": "+919999988888"
}
```

### Verify OTP
* **URL:** `/api/auth/otp/verify`
* **Method:** `POST`
* **Request Body:**
```json
{
  "phone_number": "+919999988888",
  "otp": "123456"
}
```
* **Response (200 OK):**
```json
{
  "message": "OTP verification successful",
  "token": "eyJhbGci...",
  "user": {
    "id": 2,
    "email": "user_1234@designvallet.com",
    "full_name": "User 8888",
    "is_admin": false
  }
}
```

---

## 2. Image Gallery Endpoints (`/api/images`)

### List Marketplace Catalog
* **URL:** `/api/images`
* **Method:** `GET`
* **Query Parameters (Optional):**
  * `category`: Filter by image category (e.g. `Nature`, `Urban`, `Abstract`, `Portrait`)
  * `search`: Matches keywords in title or descriptions.
* **Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Majestic Mountain Sunrise",
    "description": "Alpine peak sunrise views...",
    "category": "Nature",
    "price": "499.00",
    "preview_url": "http://localhost:5000/api/images/mock-preview/sunrise.jpg"
  }
]
```

### Get Image Details
* **URL:** `/api/images/:id`
* **Method:** `GET`
* **Response (200 OK):**
```json
{
  "id": 1,
  "title": "Majestic Mountain Sunrise",
  "description": "Alpine peak sunrise views...",
  "category": "Nature",
  "price": "499.00",
  "preview_url": "http://localhost:5000/api/images/mock-preview/sunrise.jpg"
}
```

---

## 3. Payments Endpoints (`/api/payments`)

### Create Payment Order
* **URL:** `/api/payments/order`
* **Method:** `POST`
* **Headers:** Required `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "image_id": 1,
  "coupon_code": "SAVE10"
}
```
* **Response (201 Created):**
```json
{
  "message": "Razorpay order created successfully.",
  "order_id": "order_MkB94d3hSg09",
  "amount": 449.10,
  "currency": "INR",
  "image_title": "Majestic Mountain Sunrise"
}
```

### Verify Signature
* **URL:** `/api/payments/verify`
* **Method:** `POST`
* **Headers:** Required `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "razorpay_order_id": "order_MkB94d3hSg09",
  "razorpay_payment_id": "pay_MkC98h9h2o3k",
  "razorpay_signature": "cryptographic_sha256_signature_hex"
}
```
* **Response (200 OK):**
```json
{
  "message": "Payment verified successfully. Download granted.",
  "order_id": "order_MkB94d3hSg09"
}
```

---

## 4. Orders & Downloads Endpoints (`/api/orders`)

### List My Purchases
* **URL:** `/api/orders/my-purchases`
* **Method:** `GET`
* **Headers:** Required `Authorization: Bearer <token>`
* **Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Majestic Mountain Sunrise",
    "description": "Alpine peak sunrise views...",
    "category": "Nature",
    "price": "499.00",
    "preview_url": "http://localhost:5000/api/images/mock-preview/sunrise.jpg",
    "order_id": 4,
    "purchase_date": "2026-06-09T10:00:00.000Z"
  }
]
```

### Download Original File
* **URL:** `/api/orders/download/:image_id`
* **Method:** `GET`
* **Headers:** Required `Authorization: Bearer <token>`
* **Response (200 OK - If Purchased):**
```json
{
  "message": "Download URL generated successfully.",
  "download_url": "https://design-vallet-originals-private.s3.amazonaws.com/originals/sunrise_orig.jpg?AWSAccessKeyId=..."
}
```
* **Error Response (403 Forbidden - If Unpurchased):**
```json
{
  "error": "Access Denied. You have not purchased this image, or payment is still pending."
}
```

### Fetch PDF Invoice
* **URL:** `/api/orders/invoice/:order_id`
* **Method:** `GET`
* **Headers:** Required `Authorization: Bearer <token>`
* **Response (200 OK):**
  * Binary dynamic Stream containing `Content-Type: application/pdf` inline file payload.
