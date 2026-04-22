const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db/pool');

/**
 * POST /api/sessions
 * Trainer creates a session
 */
router.post('/', requireAuth, requireRole(['trainer']), async (req, res) => {
  try {
    const { batch_id, title, date, start_time, end_time } = req.body;

    if (!batch_id || !title || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'All fields required: batch_id, title, date, start_time, end_time' });
    }

    // Verify trainer owns this batch
    const check = await query(
      'SELECT 1 FROM batch_trainers WHERE batch_id = $1 AND trainer_id = $2',
      [batch_id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this batch' });
    }

    const result = await query(`
      INSERT INTO sessions (batch_id, trainer_id, title, date, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [batch_id, req.user.id, title, date, start_time, end_time]);

    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * Returns sessions relevant to the user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let result;

    if (role === 'student') {
      result = await query(`
        SELECT s.*, b.name as batch_name,
          u.name as trainer_name,
          a.status as my_attendance,
          a.marked_at
        FROM sessions s
        JOIN batch_students bs ON bs.batch_id = s.batch_id AND bs.student_id = $1
        JOIN batches b ON b.id = s.batch_id
        JOIN users u ON u.id = s.trainer_id
        LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
        ORDER BY s.date DESC, s.start_time DESC
      `, [userId]);
    } else if (role === 'trainer') {
      result = await query(`
        SELECT s.*, b.name as batch_name,
          COUNT(DISTINCT bs.student_id) as total_students,
          COUNT(DISTINCT a.student_id) as marked_count
        FROM sessions s
        JOIN batches b ON b.id = s.batch_id
        LEFT JOIN batch_students bs ON bs.batch_id = s.batch_id
        LEFT JOIN attendance a ON a.session_id = s.id
        WHERE s.trainer_id = $1
        GROUP BY s.id, b.name
        ORDER BY s.date DESC, s.start_time DESC
      `, [userId]);
    } else {
      result = await query(`
        SELECT s.*, b.name as batch_name,
          u.name as trainer_name,
          COUNT(DISTINCT a.student_id) as marked_count
        FROM sessions s
        JOIN batches b ON b.id = s.batch_id
        JOIN users u ON u.id = s.trainer_id
        LEFT JOIN attendance a ON a.session_id = s.id
        GROUP BY s.id, b.name, u.name
        ORDER BY s.date DESC, s.start_time DESC
      `);
    }

    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/sessions/:id/attendance
 * Trainer: full attendance list for a session
 */
router.get('/:id/attendance', requireAuth, requireRole(['trainer', 'institution', 'programme_manager', 'monitoring_officer']), async (req, res) => {
  try {
    const { id } = req.params;

    const sessionResult = await query(`
      SELECT s.*, b.name as batch_name, u.name as trainer_name
      FROM sessions s
      JOIN batches b ON b.id = s.batch_id
      JOIN users u ON u.id = s.trainer_id
      WHERE s.id = $1
    `, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Trainer can only see their own sessions
    if (req.user.role === 'trainer' && sessionResult.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your session' });
    }

    const attendance = await query(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email,
        a.status,
        a.marked_at
      FROM batch_students bs
      JOIN users u ON u.id = bs.student_id
      LEFT JOIN attendance a ON a.session_id = $1 AND a.student_id = u.id
      WHERE bs.batch_id = $2
      ORDER BY u.name
    `, [id, sessionResult.rows[0].batch_id]);

    res.json({
      session: sessionResult.rows[0],
      attendance: attendance.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

module.exports = router;
