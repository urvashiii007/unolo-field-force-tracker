# 1. If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

If 10,000 employees try to check in at the same time, the **first component that would break is the database layer**, followed by the backend server.

I will explain this step by step.

#### What happens during a check-in?

When an employee checks in, the following things happen:
1. The frontend sends a request to the backend (`POST /api/checkin`)
2. The backend:
   - Validates the user and client
   - Checks if the employee already has an active check-in
   - Inserts a new record into the `checkins` table
3. The database writes the check-in data to disk

If 10,000 users do this **at the same time**, all these operations happen concurrently.

#### What would break first and why?

##### 1. Database (SQLite) – Primary Bottleneck

This application uses **SQLite**, which is a file-based database.

Problems with SQLite under high load:
- SQLite allows only **one write operation at a time**
- Multiple simultaneous INSERT queries cause database locking
- Requests start waiting, slowing down the system
- Some requests may fail with errors like:
  - `SQLITE_BUSY`
  - `database is locked`

So, with 10,000 concurrent check-ins:
➡️ **The database would break first**

##### 2. Backend Server – Secondary Issue

After the database slows down:
- Backend requests start piling up
- Node.js event loop gets busy waiting for database responses
- API response time increases
- Users experience slow UI or failed check-ins

##### 3. Network and API Throughput (Later Stage)

If the system grows further:
- Single backend instance may not handle all requests
- CPU and memory usage increase
- Requests may time out

#### How would I fix this problem?

I would fix this problem in **phases**, starting with the most critical issue.

### Step 1: Replace SQLite with a Production Database

Replace SQLite with:
- **PostgreSQL** or **MySQL**

Why?
- They support multiple concurrent writes
- Better performance under high load
- Support transactions and row-level locking

This alone would solve most concurrency issues.

### Step 2: Use Database Connection Pooling

- Instead of opening a new DB connection for every request
- Maintain a pool of reusable connections

Benefits:
- Faster request handling
- Better resource usage
- Improved scalability

### Step 3: Add Proper Indexing

Add indexes on frequently used columns like:
- `employee_id`
- `checkin_time`
- `status`

This makes:
- Active check-in checks faster
- Dashboard and report queries faster

### Step 4: Scale the Backend Horizontally

- Run multiple backend server instances
- Use a load balancer (e.g., Nginx)

This allows:
- Handling more simultaneous users
- Better fault tolerance

### Step 5: Optional Advanced Improvements

For very large scale systems:
- Use a message queue (Redis / RabbitMQ) to queue check-ins
- Process check-ins asynchronously
- Add rate limiting to prevent abuse
- Cache frequently accessed data

#### Summary (In Simple Words)

- **First thing to break:** SQLite database (cannot handle many writes)
- **Main fix:** Move to PostgreSQL/MySQL
- **Further improvements:** Pooling, indexing, scaling, queues
- **Result:** System becomes reliable, fast, and scalable

This approach follows real-world industry practices and ensures the application can handle large numbers of users smoothly.

---


# 2. The current JWT implementation has a security issue. What is it and how would you improve it?

The current JWT implementation has **multiple security issues**, the most
critical one being **exposing sensitive information and weak secret handling**.
I will explain this step by step from a beginner’s perspective.

### What is JWT? (Quick Basics)

JWT (JSON Web Token) is used for:
- Authentication (who the user is)
- Authorization (what the user is allowed to do)

After login:
- Backend creates a JWT
- Frontend stores it (localStorage)
- Token is sent with every API request


##  Security Issues in the Current Implementation:


###  Security Issue 1: Incorrect Password Verification

#### What was wrong?

The login API used `bcrypt.compare()` **without `await`**:

```js
const isValidPassword = bcrypt.compare(password, user.password);
```
Since `bcrypt.compare()` is **asynchronous**, it returns a **Promise**, not a boolean value.

Because of this:

- The condition sometimes evaluated incorrectly
- Login failed even with correct credentials
- Authentication behavior was unreliable


#### ✅ How I Fixed It

I added `await` before `bcrypt.compare()`:

```js
const isValidPassword = await bcrypt.compare(password, user.password);

```

### Why this fix is correct

- Ensures the password comparison completes before proceeding

- Prevents intermittent login failures

- Makes authentication logic deterministic and reliable

---

### Security Issue 2: Sensitive Data Included in JWT Payload

#### What was wrong?

Initially, the JWT payload included the **hashed password**:

```js
jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,
  password: user.password
}, secret);
```
Including passwords in JWTs is unsafe because:

- JWTs are stored on the client

- Anyone with access to the token can decode it

- Sensitive data exposure is possible


#### ✅ How I Fixed It

I removed the password from the JWT payload and included only the required fields:

```js
jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name
}, secret);
```

### Why This Fix Is Correct

- JWT should only contain minimal identification data

- Prevents exposure of sensitive information

- Follows standard authentication best practices


### Security Issue 3: Inconsistent JWT Secret Usage

#### What was wrong?

- Token creation used a fallback secret
- Token verification used only `process.env.JWT_SECRET`
- In environments without a `.env` file, valid tokens failed verification

This caused:

- Random logout issues
- Token verification failures
- Unstable authentication flow


#### ✅ How I Fixed It

I ensured the same JWT secret logic is used everywhere:

```js
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
```

This was applied consistently in:

- Login route (token creation)
- `/auth/me` route (token verification)
- Authentication middleware

### Why This Fix Is Important

- Tokens are signed and verified using the same secret
- Authentication works consistently across environments
- Prevents unexpected authorization failures

### ✅ Final Outcome After Fixes

After applying these fixes:

- Login works reliably with correct credentials
- JWTs no longer contain sensitive data
- Token verification is consistent and stable
- Authentication flow is secure and predictable

These improvements strengthened the JWT implementation without changing  
the overall architecture of the application.

---

# 3. How would you implement offline check-in support?  
*(Employee has no internet, checks in, syncs later)*

To implement offline check-in support, the goal is to allow an employee to
**record a check-in even when there is no internet connection**, and then
**automatically sync that check-in with the backend once the internet is
available again**.

This feature improves reliability for field employees working in low or
no-connectivity areas.


## Understanding the Problem

Normally, a check-in works like this:
1. Employee clicks "Check In"
2. Frontend sends API request to backend
3. Backend stores check-in in database

When there is **no internet**:
- API request fails
- Check-in data is lost
- Employee cannot mark attendance

Offline support solves this problem.

## Solution Approach

The solution is an **offline-first frontend design** with **delayed syncing**.

Key idea:
- Save check-in data **locally** when offline
- Sync it to the backend **later** when internet is restored


## Step-by-Step Implementation


### 1. Detect Internet Connectivity (Frontend)

The frontend should detect whether the device is online or offline.

This can be done using:
- `navigator.onLine`
- `online` and `offline` browser events

**Purpose:**
- Decide whether to send API request immediately
- Or store data locally for later sync


### 2. Store Check-in Data Locally When Offline

When the employee is offline:
- Do NOT call the backend API
- Save the check-in data locally

Data to store:
- employee_id
- client_id
- check-in time
- latitude & longitude
- notes
- a temporary unique ID

Storage options:
- `IndexedDB` (preferred for structured data)
- `localStorage` (simpler but limited)

This ensures **no data loss**.

### 3. Show Offline Confirmation to User

After saving locally:
- Show a message like:
  > “You are offline. Check-in saved and will sync automatically.”

This reassures the employee that the check-in was recorded.

### 4. Listen for Internet Reconnection

The frontend should listen for the browser’s `online` event.

When internet becomes available:
- Automatically fetch all locally stored check-ins
- Send them one by one to the backend API

This process can run:
- In background
- Without user interaction

### 5. Sync Check-ins to Backend

For each locally stored check-in:
1. Send API request to backend
2. If successful:
   - Remove it from local storage
3. If failed:
   - Keep it and retry later

This guarantees reliable syncing.

### 6. Backend Handling (Safety)

On the backend:
- Each offline check-in should include a unique request ID
- Backend checks if the request was already processed

This prevents:
- Duplicate check-ins
- Double attendance records


## Edge Cases Handled

- Employee stays offline for long time
- Multiple offline check-ins in one day
- App refresh before sync
- Partial sync failures
- Duplicate submissions

## Benefits of This Approach

- Employees can check in without internet
- No loss of attendance data
- Better user experience in real-world field conditions
- System remains consistent and reliable

## Final Outcome

With offline check-in support:
- Attendance works even without connectivity
- Data syncs automatically when online
- Employees are not blocked by network issues

This approach is widely used in real-world field force and delivery
applications and scales well as the system grows.

---

# 4. Explain the difference between SQL and NoSQL databases.  
### For this Field Force Tracker application, which would you recommend and why?

To answer this question, I will first explain **what SQL and NoSQL databases are**
in simple terms, then compare them, and finally recommend the best option
specifically for the **Field Force Tracker** application.


## What is a SQL Database?

SQL (Structured Query Language) databases store data in a **structured format**
using tables with fixed columns and rows.

Examples:
- MySQL
- PostgreSQL
- SQLite

### Key Characteristics of SQL Databases
- Data is stored in **tables**
- Schema (structure) is predefined
- Supports **relations** using foreign keys
- Strong consistency using **ACID properties**
- Excellent for complex queries and reporting


## What is a NoSQL Database?

NoSQL databases store data in a **flexible or schema-less format**.

Examples:
- MongoDB
- Firebase
- Cassandra
- DynamoDB

### Key Characteristics of NoSQL Databases
- Data stored as documents, key-value pairs, or graphs
- Schema can change easily
- Designed for **horizontal scaling**
- Faster for simple read/write operations
- Weaker relational support


## SQL vs NoSQL

| Feature | SQL Database | NoSQL Database |
|------|-------------|---------------|
Data structure | Tables (rows & columns) | Documents / key-value |
Schema | Fixed | Flexible |
Relationships | Strong (joins, foreign keys) | Weak or manual |
Consistency | Strong (ACID) | Eventual consistency |
Scaling | Vertical (mostly) | Horizontal |
Best for | Structured & relational data | Large, unstructured data |


## Understanding the Field Force Tracker Data

In this application, we have clearly defined and related data:

- **Users** (employees, managers)
- **Clients** (with fixed location data)
- **Check-ins** (linked to users and clients)
- **Employee–Client assignments**
- **Reports** (aggregated data using joins)

These entities are **highly relational**.

Example relationships:
- One manager → many employees
- One employee → many check-ins
- One client → many check-ins

## Query Patterns in This Project

The application frequently uses:
- `JOIN` queries (users ↔ checkins ↔ clients)
- Aggregations (`COUNT`, `SUM`, `GROUP BY`)
- Date-based filters
- Reporting queries (daily summary, dashboards)

These queries are **naturally suited for SQL databases**.

## Recommended Database for This Application

### ✅ SQL Database (PostgreSQL / MySQL)

I would recommend a **SQL database** for this Field Force Tracker.

### Reasons:

#### 1. Structured and Relational Data
- Data has a clear schema
- Relationships are important and enforced
- SQL handles this cleanly using foreign keys

#### 2. Reporting and Aggregation
- Daily summaries
- Working hour calculations
- Employee-wise reports

SQL databases excel at these operations.

#### 3. Data Consistency Is Critical
- Attendance data must be accurate
- No duplicate or conflicting check-ins
- SQL provides strong consistency guarantees

#### 4. Easier Data Validation
- Constraints like:
  - Unique users
  - Valid roles
  - Foreign key relationships
- Prevents invalid data from entering the system


## Why NoSQL Is Not Ideal Here

While NoSQL is powerful, it is **not the best fit** for this application because:
- Manual handling of relationships increases complexity
- Reporting queries become harder and slower
- Data integrity must be handled in application code
- Overkill for structured attendance data


## Final Conclusion

For the Field Force Tracker application:

- **SQL databases** are the better choice
- They match the relational nature of the data
- They support complex reporting and analytics
- They ensure strong data integrity and consistency

Using a SQL database like **PostgreSQL or MySQL** makes the system easier to
maintain, more reliable, and better suited for real-world attendance tracking.

---

# 5. What is the difference between Authentication and Authorization?  
### Identify where each is implemented in this codebase

To answer this question properly, I will first explain **Authentication** and
**Authorization** in simple terms, then explain **how and where** both are
implemented in the **Field Force Tracker** project.

-

## What is Authentication?

### Meaning:

**Authentication** means:
> *“Who are you?”*

It is the process of **verifying the identity of a user**.

Examples:
- Logging in using email and password
- Verifying a JWT token
- Checking whether a user is logged in or not

If authentication fails → user is **not allowed to enter the system at all**.


### Authentication in This Project

Authentication is implemented using **JWT (JSON Web Tokens)**.


### 1️⃣ Login Authentication

**File:** `backend/routes/auth.js`

- User provides `email` and `password`
- Backend:
  - Fetches user from database
  - Compares password using `bcrypt.compare()`
  - Generates a JWT token if credentials are valid

```js
const isValidPassword = await bcrypt.compare(password, user.password);
```
- This verifies the user’s identity
- Only valid users receive a token


### 2️⃣ JWT Token Verification

**File:** `backend/middleware/auth.js`

### Authentication Middleware

```js
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false });
        }
        req.user = user;
        next();
    });
};
```

### What This Middleware Does

- Checks if the token exists
- Verifies the token signature
- Extracts user identity into req.user

This ensures that only authenticated users can access protected APIs.

### 3️⃣ Frontend Authentication Handling

**File:** `frontend/src/utils/api.js`

### Token Management

- Token is stored in `localStorage`
- Token is automatically attached to every API request

```js
config.headers.Authorization = `Bearer ${token}`;
```

### Invalid Token Handling

  If the token is invalid:
- User is logged out automatically
- User is redirected to /login
  
  Prevents unauthenticated access

  ## What is Authorization?

### Meaning:

**Authorization** means:

> “What are you allowed to do?”

It checks **permissions after authentication**.

### Examples

- Employee can check-in
- Manager can view reports
- Employee cannot access manager reports

Even if a user is logged in, they may not have permission to perform certain actions.


## Authorization in This Project

Authorization is **role-based** (employee vs manager).


### 1️⃣ Role-Based Middleware (Backend)

**File:** `backend/middleware/auth.js`

```js
const requireManager = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Manager access required'
        });
    }
    next();
};
```
- Ensures only managers can access certain routes

### 2️⃣ Authorization in Reports Feature (Feature B)

**File:** `backend/routes/reports.js`

```js
router.get(
  '/daily-summary',
  authenticateToken,
  requireManager,
  async (req, res) => { ... }
);
```
**User must be:**

- Logged in (**Authentication**)
- A manager (**Authorization**)

Employees cannot access reports, even if they try via the API.

### 3️⃣ Authorization in Check-in Flow

**File:** `backend/routes/checkin.js`

### Employees Can

- Check in
- Check out

### Managers Cannot

- Perform employee check-ins

### Authorization Is Enforced By

- Employee–client assignment validation
- Role-based UI access

### 4️⃣ Frontend Role-Based Authorization (UI Level)

**File:** `frontend/src/components/Layout.jsx`

### Navigation Rendered Based on Role

**Managers see:**
- Dashboard
- Reports

**Employees see:**
- Dashboard
- Check In
- History

 Managers do not see Check-in options  
 Employees do not see Reports option  

This prevents unauthorized actions from the **UI level itself**.


## Authentication vs Authorization 

| Aspect | Authentication | Authorization |
|------|---------------|---------------|
| Purpose | Verify identity | Verify permissions |
| Question | Who are you? | What can you do? |
| When | First step | After authentication |
| Implemented using | JWT, bcrypt | Roles, middleware |
| Failure result | User blocked | Access denied |


### How Both Work Together in This Project

- User logs in → **Authentication**
- JWT token is issued
- Token is verified on every request → **Authentication**
- User role is checked → **Authorization**
- API or UI access is granted or denied

## Final Conclusion

- Authentication ensures only valid users can log in
- Authorization ensures users can only perform allowed actions
- This project cleanly separates both concerns
- Role-based access protects sensitive features like reports
- Security is enforced at both backend and frontend levels

This approach makes the **Field Force Tracker** secure, scalable, and production-ready.

---

# 6. Explain what a Race Condition is.Can you identify any potential race conditions in this codebase? How would you prevent them?


## What is a Race Condition?

A **race condition** happens when:

> Two or more operations try to access or modify the **same data at the same time**,  
> and the final result depends on **which operation finishes first**.

Because computers handle many requests **concurrently**, the order of execution
is not guaranteed. This can cause **unexpected, incorrect, or inconsistent data**.


### Real-Life Example

Imagine:
- Two employees try to book the **last available seat**
- Both check availability at the same time
- Both see the seat is free
- Both book it

Result: **Double booking**

This happens because there was **no protection around the shared data**.


### Why Race Conditions Are Dangerous

- Data becomes inconsistent
- Business rules break
- Bugs appear only under heavy load
- Hard to reproduce and debug


## Potential Race Conditions in This Project

Even though this is a small app, **some race conditions are possible**.

### 1️⃣ Multiple Check-ins at the Same Time (Critical)

### Where It Happens

**File:** `backend/routes/checkin.js`

Current logic:
1. Check if employee already has an active check-in
2. If not, insert new check-in

```sql
SELECT * FROM checkins
WHERE employee_id = ? AND status = 'checked_in';
```
### Race Condition in Check-In Creation

If no active check-in is found, a new check-in is inserted:

```sql
INSERT INTO checkins (...)
```

### Race Condition Scenario

If the employee:

- Clicks **Check In** multiple times very quickly  
- Or the request is retried due to network delay  

Then:

- Request A checks → no active check-in found  
- Request B checks → no active check-in found  
- Both requests insert a new check-in  

### Result

- Multiple active check-ins for the same employee  
- Business rule broken  


### Why This Happens

- The check and insert are separate operations  
- No database-level restriction exists  
- Both requests run concurrently  

### How to Prevent It  
### Best Fix: Database Constraint

Add a constraint to ensure only one active check-in per employee:

```sql
UNIQUE(employee_id, status)
WHERE status = 'checked_in'
```
- Database enforces the rule
- Even under high traffic, only one active check-in is allowed

### 2️⃣ Checkout Triggered Multiple Times

### Location

**File:** `backend/routes/checkin.js`


### Current Logic

- Fetch latest check-in
- Update status to `checked_out`

```sql
UPDATE checkins
SET status = 'checked_out'
WHERE id = ?
```

### Race Condition Scenario

If:

- Checkout button is clicked twice quickly  

Then:

- Both requests update the same row  

### Result

- Incorrect `checkout_time`
- Wrong working hours calculation


### How to Prevent It

Use a conditional update:

```sql
UPDATE checkins
SET status = 'checked_out'
WHERE id = ? AND status = 'checked_in'
```

- Only one request succeeds
- Second request safely fails

### 3️⃣ Frontend Double Submission (Already Prevented)

### Location

**File:** `frontend/pages/CheckIn.jsx`


### Risk

- User clicks **Check In** multiple times

### Existing Fix

```jsx
disabled={submitting}
```

- Prevents multiple API calls
- Avoids frontend-level race condition

## Summary of Prevention Strategies Used / Recommended

| Area | Prevention |
|-----|------------|
| Active check-in | Database constraint |
| Checkout | Conditional update |
| Frontend submit | Button disabling |


## Conclusion

In this project, the main race condition risk is around concurrent **check-in** and **checkout** requests.  
By enforcing business rules at the **database level** and using **safe update conditions**,  
these race conditions can be effectively prevented.

This ensures:

- Data consistency
- Correct attendance tracking
- Reliable behavior under concurrent usage
