# Features Implemented

This document describes the **key features implemented** in the Unolo Field Force Tracker
as part of the coding assignment.


The goal of this document is to give reviewers a **clear understanding of the functionality,
implementation approach, and reasoning** behind each feature, rather than just showing code.



## Feature A: Real-time Distance Calculation

### Overview

This feature calculates the real-time distance between an employee’s current
location and the assigned client’s location at the time of check-in.
The calculated distance is stored in the database and displayed in the UI.
If the employee is more than 500 meters away from the client location,
a warning message is shown.

---

### Purpose of the Feature

- Verify whether employees are checking in from the correct client location
- Improve accuracy and reliability of attendance data
- Help managers validate field visits more effectively

---

### Implementation Details

#### 1. Capturing Employee Location (Frontend)

**File:** `frontend/pages/CheckIn.jsx`

- Used the browser Geolocation API to fetch the employee’s latitude and longitude.
- Stored the coordinates in component state.
- Sent `latitude` and `longitude` to the backend during check-in.

---

#### 2. Fetching Client Location (Backend)

**File:** `backend/routes/checkin.js`

- Retrieved the assigned client’s latitude and longitude from the `clients` table
  using the provided `client_id`.
- Ensured the client exists before proceeding with distance calculation.

---

#### 3. Distance Calculation Logic

- Implemented the Haversine formula on the backend to calculate the distance
  between two geographic coordinates.
- Distance is calculated in kilometers and rounded to 2 decimal places.

---

#### 4. Storing Distance in Database

- Stored the calculated distance in the `distance_from_client` column
  of the `checkins` table.
- Ensured column names (`latitude`, `longitude`, `distance_from_client`)
  matched the SQLite schema to avoid runtime errors.

---

#### 5. API Enhancements

- Updated the `POST /api/checkin` endpoint to:
  - Accept `latitude` and `longitude`
  - Calculate and store `distance_from_client`
  - Return the calculated distance in the response

- If the distance is greater than 0.5 km (500 meters),
  a warning message is included in the response:
  `"You are far from the client location"`.

---

#### 6. UI Updates

**File:** `frontend/pages/CheckIn.jsx`

- Displayed the calculated distance in the Active Check-in section.
- Displayed a warning message when the employee is far from the client location.

**File:** `frontend/pages/History.jsx`

- Displayed the stored distance in the attendance history table
  so past check-ins can be reviewed.

---

### Edge Cases Handled

- Client not found
- Location permission denied (fallback location used)
- SQLite compatibility (no MySQL-specific functions)
- Floating point precision handled by rounding

---

### Final Outcome

- Real-time distance is calculated accurately
- Distance is stored and persisted in the database
- UI reflects distance and warning messages correctly
- Feature works reliably for both employees and managers

---

### Conclusion

The Real-time Distance Calculation feature enhances location authenticity
and data integrity of the Field Force Tracker. The implementation follows
clean backend-first validation, ensures database consistency, and improves
overall trust in attendance tracking.




## Feature B: Daily Summary Report (Manager Only)

### Feature Objective
The goal of Feature B is to provide **managers** with a **daily summary report**
of their team’s field activity. This report helps managers monitor productivity,
attendance, and client coverage for any selected date.

This feature is **manager-restricted**, and does not affect
existing check-in or employee workflows.

---

### Who Can Use This Feature
- ✅ Manager: Can view daily summary reports
- ❌ Employee: No access (both UI and API are restricted)


---

### High-Level Flow
1. Manager selects a date
2. Frontend requests daily summary data from backend
3. Backend validates role & date
4. Backend aggregates data using SQL
5. Frontend displays summary in tabular format

---


### Purpose of the Feature

- Give managers a clear daily overview of team productivity
- Track attendance and working hours at a team and employee level
- Avoid manual calculations or database access for reports
- Ensure reports are accurate, efficient, and scalable

---


### Implementation Details

---

#### 1. Backend API for Daily Summary Report

**File:** `backend/routes/reports.js`

- Created a new API endpoint:

GET /api/reports/daily-summary
This endpoint is responsible for **fetching and aggregating data**. 

### 2. Authentication and Authorization

The API is protected using middleware:

- `authenticateToken` ensures the user is logged in
- `requireManager` ensures only managers can access the report

Employees cannot access this API even through direct requests.

---


#### 3. Request Validation

- The API requires a `date` query parameter in `YYYY-MM-DD` format.
- Invalid or missing dates return a `400 Bad Request` response.
- Optional `employee_id` filter allows viewing report for a single employee.

---

#### 4. Efficient SQL Aggregation Logic

- Implemented a **single optimized SQL query** (no N+1 queries)
- Used `LEFT JOIN` to ensure employees with zero check-ins still appear
- Calculated working hours using SQLite-compatible logic

**Working hours calculation:**

```sql
(julianday(checkout_time) - julianday(checkin_time)) * 24
```
Total working hours are rounded to 2 decimal places for accuracy.

---

### 5. Data Returned by the API

The API returns a structured JSON response containing:

- Selected report date
- Team-level summary:
  - Total check-ins
  - Total working hours
  - Total clients visited
- Employee-wise breakdown:
  - Employee name
  - Total check-ins
  - Clients visited
  - Working hours

This structure allows direct frontend rendering without additional processing.

---

### 6. Server Registration

**File:** `backend/server.js`

The reports route is registered as:

```js
app.use('/api/reports', reportRoutes);
```

This exposes the Daily Summary API to the frontend application.

--- 

## Frontend Implementation

---

### 7. Reports Page UI

**File:** `frontend/src/pages/Reports.jsx`

A new Reports page was created specifically for managers.  
This page calls the backend API and displays the daily summary.

**Features implemented:**

- Date picker to select the report date
- API call to fetch daily summary data
- Loading and empty-state handling
- Employee-wise summary table
- Team totals displayed at the top

The frontend page consumes the backend API:
GET /api/reports/daily-summary?date=YYYY-MM-DD


---

### 8. Frontend Routing

**File:** `frontend/src/App.jsx`

A protected frontend route was added:

```jsx
<Route path="/reports" element={<Reports />} />
```

**Important distinction:**

- `/reports` → UI page route  
- `/api/reports/daily-summary` → Backend data API  

The page is accessible only after login and within the main layout.

---

### 9. Role-Based Navigation

**File:** `frontend/src/components/Layout.jsx`

Navigation is rendered dynamically based on user role:

- **Managers see:** Dashboard, Reports
- **Employees see:** Dashboard, Check In, History

This ensures:

- Employees cannot see or access the Reports page
- Managers have exclusive access to reporting features

---

### Security Considerations

- Reports API is protected at both backend and frontend levels
- Employees cannot access reports via UI or direct API calls
- Managers can only view reports for employees assigned to them

---

### Edge Cases Handled

- No data available for the selected date
- Employees with zero check-ins
- Partial-day check-ins (missing checkout time)
- Invalid date input
- SQLite compatibility (no MySQL-specific functions used)
