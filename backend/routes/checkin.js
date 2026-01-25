const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Utility: Calculate distance between two lat/lng points (Haversine formula)
|--------------------------------------------------------------------------
| Returns distance in kilometers
*/
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in KM
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in KM
}

// Get assigned clients for employee
router.get('/clients', authenticateToken, async (req, res) => {
    try {
        const [clients] = await pool.execute(
            `SELECT c.* FROM clients c
             INNER JOIN employee_clients ec ON c.id = ec.client_id
             WHERE ec.employee_id = ?`,
            [req.user.id]
        );

        res.json({ success: true, data: clients });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch clients' });
    }
});

// Create new check-in (FEATURE A IMPLEMENTED HERE)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { client_id, latitude, longitude, notes } = req.body;

        // FIX: Validation error should return 400 Bad Request
        if (!client_id || latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'Client ID, latitude and longitude are required'
            });
        }

        // Check if employee is assigned to this client
        const [assignments] = await pool.execute(
            'SELECT * FROM employee_clients WHERE employee_id = ? AND client_id = ?',
            [req.user.id, client_id]
        );

        if (assignments.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this client'
            });
        }

        // Check for existing active check-in

         // FIX: Use single quotes for string literals in SQLite
// Double quotes are treated as column identifiers, causing SQL errors
        const [activeCheckins] = await pool.execute(
            "SELECT * FROM checkins WHERE employee_id = ? AND status = 'checked_in'",
            [req.user.id]
        );

        if (activeCheckins.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active check-in. Please checkout first.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | FEATURE A: Distance calculation
        |--------------------------------------------------------------------------
        | 1. Fetch client location
        | 2. Calculate distance (employee ↔ client)
        | 3. Store distance in DB
        */

        // Fetch client latitude & longitude
        const [clients] = await pool.execute(
            'SELECT latitude, longitude FROM clients WHERE id = ?',
            [client_id]
        );

        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        const clientLat = clients[0].latitude;
        const clientLng = clients[0].longitude;

        // Calculate distance in KM (rounded to 2 decimals)
        const distanceKm = calculateDistance(
            latitude,
            longitude,
            clientLat,
            clientLng
        );
        const roundedDistance = Number(distanceKm.toFixed(2));

        

        
        // FIX: Updated column names from lat/lng to latitude/longitude
// to match the actual SQLite schema defined in init-db.js.
// This prevents schema mismatch errors during check-in creation.
        const [result] = await pool.execute(
            `INSERT INTO checkins
             (employee_id, client_id, latitude, longitude, distance_from_client, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, 'checked_in')`,
            [
                req.user.id,
                client_id,
                latitude,
                longitude,
                roundedDistance,
                notes || null
            ]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                distance_from_client: roundedDistance,
                warning:
                    roundedDistance > 0.5
                        ? 'You are far from the client location'
                        : null
            }
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Check-in failed' });
    }
});

// Checkout from current location
router.put('/checkout', authenticateToken, async (req, res) => {
    try {
        const [activeCheckins] = await pool.execute(
            'SELECT * FROM checkins WHERE employee_id = ? ORDER BY checkin_time DESC LIMIT 1',
            [req.user.id]
        );

        if (activeCheckins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active check-in found'
            });
        }

        
        // FIX: 
// 1. Replaced MySQL-specific NOW() with SQLite-compatible CURRENT_TIMESTAMP
// 2. Replaced double quotes with single quotes for string literal 'checked_out'
//    to prevent SQLite from treating it as a column name
        await pool.execute(
            "UPDATE checkins SET checkout_time = CURRENT_TIMESTAMP, status = 'checked_out' WHERE id = ?",
            [activeCheckins[0].id]
        );

        res.json({ success: true, message: 'Checked out successfully' });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, message: 'Checkout failed' });
    }
});

// Get check-in history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = `
            SELECT ch.*, c.name as client_name, c.address as client_address
            FROM checkins ch
            INNER JOIN clients c ON ch.client_id = c.id
            WHERE ch.employee_id = ?
        `;
        const params = [req.user.id];

        if (start_date) {
            query += ` AND DATE(ch.checkin_time) >= '${start_date}'`;
        }
        if (end_date) {
            query += ` AND DATE(ch.checkin_time) <= '${end_date}'`;
        }

        query += ' ORDER BY ch.checkin_time DESC';

        const [checkins] = await pool.execute(query, params);
        res.json({ success: true, data: checkins });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
});

// Get current active check-in
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const [checkins] = await pool.execute(
            `SELECT ch.*, c.name as client_name
             FROM checkins ch
             INNER JOIN clients c ON ch.client_id = c.id
             WHERE ch.employee_id = ? AND ch.status = 'checked_in'
             ORDER BY ch.checkin_time DESC LIMIT 1`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: checkins.length > 0 ? checkins[0] : null
        });
    } catch (error) {
        console.error('Active checkin error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active check-in' });
    }
});

module.exports = router;

