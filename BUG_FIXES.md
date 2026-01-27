### Bug: Employee dashboard crashing due to SQL syntax error (last 7 days stats)

- ### Location:  
  `backend/routes/dashboard.js` (Employee dashboard → weekly statistics query)

- ### What was wrong:  
  The employee dashboard API was using MySQL-specific date arithmetic:
  `DATE_SUB(NOW(), INTERVAL 7 DAY)` to calculate last 7 days of check-ins.  
  However, the application database is SQLite, which does not support the
  `INTERVAL` keyword or `DATE_SUB()` function.  
  As a result, the SQL query failed at runtime and caused the employee dashboard
  API to crash with a `SqliteError: near "7": syntax error`.

- ### How I fixed it:  
  I replaced the MySQL-only date syntax with SQLite-compatible date modifiers.
  Specifically, I used `DATE('now', '-7 days')` to correctly filter check-ins
  from the last 7 days.  
  
- ### Why this fix is correct:  
  SQLite performs date arithmetic using date and time modifiers rather than
  `INTERVAL`. The `DATE('now', '-7 days')` expression is officially supported
  by SQLite and reliably returns records from the last 7 days without causing
  syntax errors. This makes the query portable and stable for the current
  database setup.

---

### Bug: History page crashing due to reduce() being called on null

- ### Location:  
  `frontend/src/pages/History.jsx` (totalHours calculation)

- ### What was wrong:  
  The History component initialized the `checkins` state as `null` and immediately
  attempted to call `.reduce()` on it to calculate total working hours.
  During the initial render, before the API response was loaded, this caused
  a runtime error: `Cannot read properties of null (reading 'reduce')`,
  which crashed the History page.

- ### How I fixed it:  
  I initialized the `checkins` state as an empty array instead of `null`.
  This ensures that array methods like `.reduce()` and `.map()` are always safe
  to call, even before the API data is available.

- ### Why this fix is correct:  
  React components often render before asynchronous data is fetched.
  Initializing state with a safe default value (empty array) is a standard
  React best practice that prevents runtime errors and ensures predictable rendering.

---


### Bug: Check-out API failing due to unsupported NOW() function in SQLite

- ### Location:  
  `backend/routes/checkin.js` (checkout update query)

- ### What was wrong:  
  The checkout API used the MySQL-specific `NOW()` function to set the
  `checkout_time`. Since the application uses SQLite, this function does
  not exist, causing the query to fail with
  `SqliteError: no such function: NOW` and return a 500 error.

- ### How I fixed it:  
  I replaced the `NOW()` function with SQLite-compatible
  `CURRENT_TIMESTAMP` while keeping the rest of the logic unchanged.

- ### Why this fix is correct:  
  SQLite provides `CURRENT_TIMESTAMP` for retrieving the current date
  and time. Using it ensures database compatibility and prevents runtime
  SQL errors during the checkout operation.

---


### Bug: Checkout API failing due to incorrect SQL syntax in SQLite

- ### Location:  
  `backend/routes/checkin.js` (active check-in query and checkout update query)

- ### What was wrong:  
  The check-in and checkout queries used double quotes around string values
  such as `"checked_in"` and `"checked_out"`. In SQLite, double quotes are
  interpreted as column identifiers, not string literals. As a result,
  SQLite attempted to find columns named `checked_in` and `checked_out`,
  causing the checkout API to fail with
  `SqliteError: no such column: checked_out`.

- ### How I fixed it:  
  I replaced double quotes with single quotes for string values and updated
  the checkout timestamp logic to use SQLite-compatible
  `CURRENT_TIMESTAMP`.

- ### Why this fix is correct:  
  SQLite requires single quotes for string literals. Using proper quoting
  ensures the database correctly interprets status values and prevents
  runtime SQL errors during check-in and checkout operations.

---

### Bug: Check-in failing due to mismatched latitude/longitude column names

- ### Location:  
  `backend/routes/checkin.js` (check-in insert query)

- ### What was wrong:  
  The check-in insert query attempted to use column names `lat` and `lng`,
  but the actual SQLite schema defines these columns as `latitude` and
  `longitude`. This mismatch caused SQLite to throw the error:
  `table checkins has no column named lat`, resulting in check-in failures.

- ### How I fixed it:  
  I updated the insert query to use the correct column names
  `latitude` and `longitude` as defined in the database schema.
  No changes were made to the schema itself.

- ### Why this fix is correct:  
  Aligning query column names with the actual database schema prevents
  runtime SQL errors and ensures that location data is stored correctly.
  This also prepares the system for future distance calculation features
  without introducing schema changes during the bug-fix phase.

---


### Bug: Notes not displayed in Active Check-in view

- ### Location:  
  `frontend/src/pages/CheckIn.jsx` (Active Check-in UI section)

- ### What was wrong:  
  Although notes entered during check-in were correctly saved in the database,
  they were not displayed in the Active Check-in view. This made it appear as
  if the notes were not recorded.

- ### How I fixed it:  
  I updated the Active Check-in UI to conditionally render the notes field
  when it is present in the active check-in data.

- ### Why this fix is correct:  
  This ensures consistency between saved data and the user interface,
  improves usability, and does not alter any backend logic.

---

### Bug: Login intermittently failed even with correct credentials

- ### Location:
  backend/routes/auth.js (login route)

- ### What was wrong:
  The password verification used `bcrypt.compare()` without awaiting it.
  Since `bcrypt.compare()` is asynchronous and returns a Promise, the
  condition sometimes evaluated incorrectly, causing valid logins to fail.

- ### How I fixed it:
  Added `await` before `bcrypt.compare()` to correctly resolve the
  password comparison result.

- ### Why this fix is correct:
  Awaiting the Promise ensures accurate password validation and removes
  intermittent authentication failures.

--- 

### Bug: Sensitive data included in JWT payload

- ### Location:
  backend/routes/auth.js (JWT creation)

- ### What was wrong:
  The hashed user password was included inside the JWT payload, which is
  insecure and unnecessary.

- ### How I fixed it:
  Removed the password field from the JWT payload and only included
  required user identification fields.

- ### Why this fix is correct:
  JWTs should never contain sensitive information. This improves security
  and follows standard authentication best practices.

---

### Bug: Auth token verification failed when environment variable was missing

- ### Location:
  backend/routes/auth.js (`GET /auth/me`)

- ### What was wrong:
  The token verification relied only on `process.env.JWT_SECRET`,
  while the login route used a fallback secret. This caused token
  verification to fail in environments without a `.env` file.

- ### How I fixed it:
  Used the same JWT secret fallback logic in both login and profile routes.

- ### Why this fix is correct:
  Ensures consistent token signing and verification across the application.

---

### Bug: Dashboard showed incorrect data due to hard-coded user ID check

- ### Location:
  `frontend/src/pages/Dashboard.jsx`

- ### What was wrong:
  The dashboard API endpoint was selected using a hard-coded check
  (`user.id === 1`) to determine manager access. This caused incorrect
  dashboard data to be shown when the manager did not have ID 1.

- ### How I fixed it:
  Replaced the hard-coded user ID check with a role-based check
  (`user.role === 'manager'`) to correctly determine which dashboard
  endpoint to call.

- ### Why this fix is correct:
  User roles are the correct and scalable way to control access.
  This ensures managers always receive team-level data and employees
  receive their personal dashboard data.

---

### Bug: Incorrect HTTP status code for validation errors in check-in API

- ### Location:
  backend/routes/checkin.js (`POST /checkin`)

- ### What was wrong:
  The API returned HTTP 200 OK even when required input (client_id)
  was missing, which is a client-side validation error.

- ### How I fixed it:
  Updated the response to return HTTP 400 Bad Request when
  validation fails.

- ### Why this fix is correct:
  Validation errors should return 4xx status codes to clearly
  indicate client-side issues and follow REST API best practices.

---

### Bug: Memory leak in ActivityList due to missing interval cleanup

- ### Location:
  frontend/components/ActivityList.jsx

- ### What was wrong:
  The component created a `setInterval` inside a `useEffect` hook but did
  not provide a cleanup function. As a result, the interval continued
  running even after the component was unmounted, causing unnecessary
  background executions and potential memory leaks.

- ### How I fixed it:
  Added a cleanup function to the `useEffect` hook that clears the
  interval when the component unmounts.

- ### Why this fix is correct:
  In React, effects that create side effects such as timers or
  subscriptions must always be cleaned up. This prevents memory leaks,
  avoids stale state updates, and ensures predictable component behavior.

---

### Bug: Incorrect hook usage and stale state in Counter component

- ### Location:
  frontend/components/Counter.jsx

- ### What was wrong:
  1. `setInterval` used a stale `count` value, causing incorrect auto-increment behavior.
  2. A `useEffect` hook was conditionally executed, violating React's Rules of Hooks.
  3. A `useRef` was initialized but never updated, resulting in stale values when accessed.

- ### How I fixed it:
  1. Replaced state updates inside `setInterval` with functional updates.
  2. Refactored the conditional `useEffect` to always run and moved the condition inside the effect.
  3. Synced the ref value with state using a dedicated `useEffect`.

- ### Why this fix is correct:
  These changes ensure predictable state updates, follow React hook rules,
  and prevent stale data usage, improving correctness and stability.

---

### Bug: Manager users could access employee-only navigation links

- ### Location:
  frontend/components/Layout.jsx

- ### What was wrong:
  The navigation menu displayed "Check In" and "History" tabs
  for all users, including managers. Managers are not supposed
  to perform check-ins, leading to role confusion and incorrect UX.

- ### How I fixed it:
  Implemented role-based navigation logic to show only the
  Dashboard tab for managers and full navigation for employees.

- ### Why this fix is correct:
  It aligns the UI with backend authorization rules, prevents
  invalid user actions, and improves role clarity and usability.

---

### Bug: Redirect loop caused by authentication error handling

- ### Location:
  frontend/src/utils/api.js

- ### What was wrong:
  The application automatically redirected the user to the login page
  whenever an API returned a 401 or 403 error. This redirection also
  happened when the user was already on the login page (for example,
  after a failed login attempt), causing the page to reload repeatedly.

- ### How I fixed it:
  Added a check to confirm the current route before redirecting.
  The user is now redirected to the login page only if they are
  not already on it.

- ### Why this fix is correct:
  This prevents unnecessary page reloads, avoids redirect loops,
  and provides a smoother and more predictable login experience.
