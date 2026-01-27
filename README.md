# Unolo Field Force Tracker

A web application for tracking field employee check-ins at client locations.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, SQLite
- **Authentication & Security:** JWT-based authentication, Role-based authorization (Manager / Employee)

## Key Features Implemented

---

### ✅ Role-Based Access Control

**Employees**
- Check in / check out at assigned client locations
- Add notes during check-in
- View personal check-in history

**Managers**
- View team dashboard
- Access daily summary reports
- Cannot perform employee check-ins

---

### ✅ Feature A: Location-Aware Check-In

- Captures employee’s current GPS location
- Stores latitude & longitude with each check-in
- Calculates distance between employee and client location
- Saves distance in the database for audit & reporting
- Notes entered during check-in are stored and visible

---

### ✅ Feature B: Daily Summary Report (Manager Only)

- Managers can view a daily report of their team’s activity
- Shows:
  - Total check-ins
  - Total working hours
  - Total clients visited
  - Employee-wise breakdown
- Efficient single-query SQL aggregation
- Protected at both API level and UI level

---

### ✅ Secure Authentication Improvements

- Fixed async password comparison (`bcrypt.compare`)
- Removed password from JWT payload
- Unified JWT secret handling
- Automatic logout on token expiry or invalid token

---

### ✅ Robust Error Handling & Bug Fixes

- Fixed SQLite vs MySQL syntax issues
- Fixed history page crashes due to null state
- Prevented multiple active check-ins
- Fixed memory leaks in React components
- Corrected column mismatches (`lat/lng → latitude/longitude`)
- Proper cleanup for intervals and effects


## Quick Start

### 1. Backend Setup

```bash
cd backend
npm run setup    # Installs dependencies and initializes database
cp .env.example .env
npm run dev
```

Backend runs on: `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Test Credentials

| Role     | Email              | Password    |
|----------|-------------------|-------------|
| Manager  | manager@unolo.com | password123 |
| Employee | rahul@unolo.com   | password123 |
| Employee | priya@unolo.com   | password123 |

## Project Structure

```

├── backend/
│   ├── config/          # Database connection
│   ├── middleware/      # Auth & role checks
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── checkin.js
│   │   ├── dashboard.js
│   │   └── reports.js   # Feature B
│   ├── scripts/         # Database init scripts
│   │   └── init-db.js
│   └── server.js        # Express app entry
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CheckIn.jsx
│   │   │   ├── History.jsx
│   │   │   └── Reports.jsx
│   │   └── utils/
│   │       └── api.js
└── database.sqlite

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Check-ins
- `GET /api/checkin/clients` - Get assigned clients
- `POST /api/checkin` - Create check-in
- `PUT /api/checkin/checkout` - Checkout
- `GET /api/checkin/history` - Get check-in history
- `GET /api/checkin/active` - Get active check-in

### Dashboard
- `GET /api/dashboard/stats` - Manager stats
- `GET /api/dashboard/employee` - Employee stats

### Reports API(Feature B)
`GET /api/reports/daily-summary?date=YYYY-MM-DD`

- Manager-only access
- Optional filter: `employee_id`



## Architecture Decisions

- SQLite chosen for simplicity and zero external dependency
- JWT used for stateless authentication
- Role-based routing and UI rendering for enhanced security
- Single-query SQL aggregation to avoid N+1 issues
- Backend-first validation to prevent invalid application state
- Avoided third-party services to keep cost low and maintain full control



## Notes

- The database uses SQLite - no external database setup required
- Run `npm run init-db` to reset the database to initial state



## Conclusion

This project demonstrates:

- Clean full-stack architecture
- Real-world bug fixing
- Secure authentication practices
- Scalable reporting design
- Practical engineering trade-offs suitable for a startup
