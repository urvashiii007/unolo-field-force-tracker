const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Daily Summary Report (Manager only)
router.get(
  '/daily-summary',
  authenticateToken,
  requireManager,
  async (req, res) => {
    try {
      const { date, employee_id } = req.query;

      // 1️⃣ Validate date
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Valid date (YYYY-MM-DD) is required'
        });
      }

      // 2️⃣ Base params
      const params = [date, req.user.id];
      let employeeFilter = '';

      if (employee_id) {
        employeeFilter = 'AND u.id = ?';
        params.push(employee_id);
      }

      // 3️⃣ Single efficient query (NO N+1)
      const [rows] = await pool.execute(
        `
        SELECT
            u.id AS employee_id,
            u.name AS employee_name,
            COUNT(ch.id) AS total_checkins,
            COUNT(DISTINCT ch.client_id) AS clients_visited,
            ROUND(
              SUM(
                CASE
                  WHEN ch.checkout_time IS NOT NULL
                  THEN (julianday(ch.checkout_time) - julianday(ch.checkin_time)) * 24
                  ELSE 0
                END
              ),
              2
            ) AS working_hours
        FROM users u
        LEFT JOIN checkins ch
          ON ch.employee_id = u.id
          AND DATE(ch.checkin_time) = ?
        WHERE u.manager_id = ?
        ${employeeFilter}
        GROUP BY u.id, u.name
        ORDER BY u.name
        `,
        params
      );

      // 4️⃣ Team-level aggregates
      const teamTotals = rows.reduce(
        (acc, row) => {
          acc.total_checkins += row.total_checkins;
          acc.total_hours += row.working_hours || 0;
          acc.total_clients += row.clients_visited;
          return acc;
        },
        { total_checkins: 0, total_hours: 0, total_clients: 0 }
      );

      res.json({
        success: true,
        data: {
          date,
          team_summary: {
            total_checkins: teamTotals.total_checkins,
            total_working_hours: Number(teamTotals.total_hours.toFixed(2)),
            total_clients_visited: teamTotals.total_clients
          },
          employees: rows
        }
      });
    } catch (error) {
      console.error('Daily summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily summary'
      });
    }
  }
);

module.exports = router;
