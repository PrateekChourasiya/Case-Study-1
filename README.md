# File Management REST API (MVC Architecture)

A secure and modular File Management REST API built using **Node.js, Express, MongoDB, Mongoose, Multer, Zod, and EJS**, following clean **MVC architecture** and best practices.

---

## 🌟 Key Features

- **Authentication & Security**:
  - JWT (JSON Web Token) authentication with 1-hour expiration.
  - Dual-token support: reads tokens from HTTP-only cookies **and** `Authorization: Bearer <token>` headers (ideal for Postman testing).
  - Password encryption using `bcrypt` (10 salt rounds).
  - Schema-based request validation using `zod`.
  - Prohibits dangerous executable files (`.exe`, `.sh`, `.bat`, etc.).

- **Dynamic Category-Based Storage**:
  - Automatically categorizes and routes uploads into dedicated subfolders based on file type:
    - `uploads/images/` — `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
    - `uploads/pdf/` — `.pdf`
    - `uploads/doc/` — `.doc`, `.docx`, `.txt`, `.rtf`, `.odt`
    - `uploads/ppt/` — `.ppt`, `.pptx`, `.odp`
    - `uploads/others/` — `.xlsx`, `.csv`, `.zip`, `.rar`, etc.
  - Automatic physical disk cleanup (`fs.promises.unlink`) on file replacement or deletion.

- **File Metadata & User Reference**:
  - File model stores `name`, `originalName`, `systemFilename`, `category`, `type` (MIME), `extension`, `size`, `subfolderPath`, `upload_at`, and `uploaded_by`.
  - User model maintains `filesUploaded` (array of `ObjectId` references to `File`) and `filesUploadedCount`.
  - Fetching user profile populates the uploaded file references.

- **Query Parameters**:
  - Category filters: `?image=true`, `?pdf=true`, `?doc=true`, `?ppt=true`
  - Size threshold: `?size=50` (returns files $\ge$ 50 KB)
  - Keyword search: `?search=filename`
  - Sorting: `?sort=oldest` or `?sort=newest`

- **Error Handling & Logging**:
  - Centralized 4-parameter `errorMiddleware` catching Mongoose validation/cast errors, duplicate keys (`11000`), JWT expiration, and Multer upload limit violations.
  - HTTP request logging via `morgan` logging method, path, status, and response time in milliseconds.

- **View Layer (MVC)**:
  - Minimalist server-rendered EJS pages (`views/login.ejs`, `views/register.ejs`, `views/dashboard.ejs`) with separate dedicated CSS and JS files in `public/`.

---

## 📁 Directory Structure

```text
CaseStudy/
├── public/                      # Static assets for EJS views
│   ├── css/
│   │   ├── login.css
│   │   ├── register.css
│   │   └── dashboard.css
│   └── js/
│       ├── login.js
│       ├── register.js
│       └── dashboard.js
├── uploads/                     # Local disk storage
│   ├── images/
│   ├── pdf/
│   ├── doc/
│   ├── ppt/
│   └── others/
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/
│   ├── authController.js        # Auth logic (register, login, logout, profile)
│   ├── fileController.js        # File CRUD & streaming logic
│   └── viewController.js        # EJS rendering logic
├── middleware/
│   ├── userMiddleware.js        # JWT access verification
│   ├── validateMiddleware.js    # Zod validation schemas
│   ├── uploadMiddleware.js      # Multer dynamic category diskStorage & filters
│   ├── loggerMiddleware.js      # Morgan HTTP request logger
│   └── errorMiddleware.js       # Centralized error handler
├── models/
│   ├── user.js                  # User model with files reference & count
│   └── file.js                  # File metadata model
├── routes/
│   ├── authRoutes.js            # /api/user endpoints
│   ├── fileRoutes.js            # /api/file endpoints
│   └── viewRoutes.js            # EJS web routes (/, /login, /register, /dashboard)
├── utils/
│   ├── AppError.js              # Operational error class
│   └── fileCategories.js        # Categorization & security whitelist
├── views/                       # EJS templates
│   ├── login.ejs
│   ├── register.ejs
│   └── dashboard.ejs
├── .env                         # Environment configuration
├── .env.example                 # Configuration template
├── .gitignore
├── package.json
└── index.js                     # Main server entry file
```

---

## 🚀 Setup & Execution

### 1. Configure Environment Variables
Open `.env` and set your MongoDB connection string and port:
```env
PORT=5000
DB_STRING=mongodb://127.0.0.1:27017/file_management_db
JWT_KEY=your_secure_secret_key_here
MAX_FILE_SIZE_MB=10
```

### 2. Start the Server
- Development mode (with auto-reload):
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```

---

## 📮 Complete Postman Testing Guide

### Base URL: `http://localhost:5000`

---

### 1. Authentication APIs

#### A. Register User
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/user/register`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
  ```json
  {
    "userName": "Prateek Chourasiya",
    "emailId": "prateek@example.com",
    "password": "Password123"
  }
  ```
- **Expected Status**: `201 Created`
- **Response**:
  ```json
  {
    "success": true,
    "message": "User registered successfully.",
    "data": {
      "user": {
        "_id": "673cf...",
        "userName": "Prateek Chourasiya",
        "emailId": "prateek@example.com",
        "filesUploadedCount": 0
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```
  *(Note: Copy the `token` or rely on the automatically saved cookie in Postman).*

---

#### B. Login User
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/user/login`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
  ```json
  {
    "emailId": "prateek@example.com",
    "password": "Password123"
  }
  ```
- **Expected Status**: `200 OK`
- **Response**: Returns JWT token and sets `token` cookie.

---

#### C. Get Profile (View User Info & Uploaded Files)
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/user/profile`
- **Headers**:
  - `Authorization`: `Bearer <PASTE_YOUR_JWT_TOKEN>` (or use Postman cookie jar)
- **Expected Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully.",
    "data": {
      "user": {
        "_id": "673cf...",
        "userName": "Prateek Chourasiya",
        "emailId": "prateek@example.com",
        "filesUploaded": [],
        "filesUploadedCount": 0
      }
    }
  }
  ```

---

#### D. Logout
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/user/logout`
- **Expected Status**: `200 OK`

---

### 2. File Management APIs

*Ensure you include `Authorization: Bearer <TOKEN>` in the headers for all `/api/file` endpoints.*

---

#### A. Upload File
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/file/upload`
- **Headers**:
  - `Authorization`: `Bearer <TOKEN>`
- **Body**: Select **`form-data`**
  - Key: `file` (Change type from Text to **File**) $\rightarrow$ Choose a file (e.g. `document.pdf` or `photo.png`)
  - Key: `name` (Text, Optional) $\rightarrow$ e.g. `My Important Report`
- **Expected Status**: `201 Created`
- **Response**:
  ```json
  {
    "success": true,
    "message": "File uploaded successfully.",
    "data": {
      "file": {
        "_id": "673d0...",
        "name": "My Important Report",
        "originalName": "document.pdf",
        "systemFilename": "1732018899123-a1b2c3d4e5f6.pdf",
        "category": "pdf",
        "type": "application/pdf",
        "extension": ".pdf",
        "size": 142500,
        "subfolderPath": "uploads/pdf/1732018899123-a1b2c3d4e5f6.pdf",
        "upload_at": "2026-11-19T12:35:00.000Z",
        "uploaded_by": "673cf..."
      }
    }
  }
  ```

---

#### B. Get All Files (With Query Parameters)
- **Method**: `GET`
- **URL Variations**:
  - Get all files:
    `http://localhost:5000/api/file/all`
  - Filter images only:
    `http://localhost:5000/api/file/all?image=true`
  - Filter PDFs only:
    `http://localhost:5000/api/file/all?pdf=true`
  - Filter Docs only:
    `http://localhost:5000/api/file/all?doc=true`
  - Filter PPTs only:
    `http://localhost:5000/api/file/all?ppt=true`
  - Filter by minimum size ($\ge$ 50 KB):
    `http://localhost:5000/api/file/all?size=50`
  - Search by file name:
    `http://localhost:5000/api/file/all?search=report`
  - Combined query:
    `http://localhost:5000/api/file/all?pdf=true&size=20&search=report&sort=oldest`
- **Expected Status**: `200 OK`

---

#### C. Get Single File Metadata
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/file/<FILE_ID>`
- **Expected Status**: `200 OK`

---

#### D. Download Physical File
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/file/<FILE_ID>/download`
- In Postman: Click **"Send and Download"** to save the actual physical file.
- **Expected Status**: `200 OK`

---

#### E. Update File
- **Method**: `PUT`
- **URL**: `http://localhost:5000/api/file/<FILE_ID>`
- **Option 1: Rename Display Name only (JSON)**:
  - Header: `Content-Type: application/json`
  - Body:
    ```json
    {
      "name": "Updated Report Name"
    }
    ```
- **Option 2: Replace Physical File (form-data)**:
  - Body: Select `form-data`
  - Key: `file` (File) $\rightarrow$ Select replacement file
  - Key: `name` (Text, optional) $\rightarrow$ `New Name`
- **Expected Status**: `200 OK`

---

#### F. Delete File
- **Method**: `DELETE`
- **URL**: `http://localhost:5000/api/file/<FILE_ID>`
- **Expected Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "File deleted successfully from database and server disk."
  }
  ```
  *(Notice: The physical file is safely deleted from `uploads/<category>/` and user's `filesUploadedCount` is decremented).*

---

### 3. Web UI (EJS Views)
Open your browser and navigate to:
- `http://localhost:5000/login`
- `http://localhost:5000/register`
- `http://localhost:5000/dashboard`
