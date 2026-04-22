const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db/pool');

/**
 * POST /api/attendance/mark
 * Student marks their own attendance for a session
 * Body: { session_id, status }
 */
router.post('/mark', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { session_id, status } = req.body;
    const studentId = req.user.id;

    if (!session_id || !status) {
      return res.status(400).json({ error: 'session_id and status are required' });
    }

    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be: present, absent, or late' });
    }

    // Verify student is enrolled in the batch that contains this session
    const enrollment = await query(`
      SELECT 1
      FROM sessions s
      JOIN batch_students bs ON bs.batch_id = s.batch_id
      WHERE s.id = $1 AND bs.student_id = $2
    `, [session_id, studentId]);

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this session\'s batch' });
    }

    // Upsert attendance (allow re-marking)
    const result = await query(`
      INSERT INTO attendance (session_id, student_id, status, marked_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET status = EXCLUDED.status, marked_at = NOW()
      RETURNING *
    `, [session_id, studentId, status]);

    res.json({ attendance: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

module.exports = router;
