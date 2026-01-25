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
