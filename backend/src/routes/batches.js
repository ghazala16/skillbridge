const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db/pool');
const { nanoid } = require('nanoid');

/**
 * POST /api/batches
 * Trainer or Institution creates a batch
 */
router.post('/', requireAuth, requireRole(['trainer', 'institution']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Batch name is required' });

    const institutionId = req.user.institution_id_fk;

    // 🔥 ADD VALIDATION HERE
    if (!institutionId) {
      return res.status(400).json({
        error: 'User is not linked to any institution'
      });
    }

    const inviteCode = nanoid(10).toUpperCase();

    const result = await query(`
      INSERT INTO batches (name, institution_id, invite_code)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, institutionId, inviteCode]);

    // If trainer, link them to this batch automatically
    if (req.user.role === 'trainer') {
      await query(`
        INSERT INTO batch_trainers (batch_id, trainer_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [result.rows[0].id, req.user.id]);
    }

    res.status(201).json({ batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

/**
 * GET /api/batches
 * Returns batches relevant to the current user's role
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, id: userId, institution_id_fk } = req.user;
    let result;

    if (role === 'trainer') {
      result = await query(`
        SELECT b.*, 
          i.name as institution_name,
          COUNT(DISTINCT bs.student_id) as student_count,
          COUNT(DISTINCT s.id) as session_count
        FROM batches b
        JOIN batch_trainers bt ON bt.batch_id = b.id
        LEFT JOIN institutions i ON i.id = b.institution_id
        LEFT JOIN batch_students bs ON bs.batch_id = b.id
        LEFT JOIN sessions s ON s.batch_id = b.id
        WHERE bt.trainer_id = $1
        GROUP BY b.id, i.name
        ORDER BY b.created_at DESC
      `, [userId]);
    } else if (role === 'student') {
      result = await query(`
        SELECT b.*, 
          i.name as institution_name,
          COUNT(DISTINCT s.id) as session_count
        FROM batches b
        JOIN batch_students bs ON bs.batch_id = b.id
        LEFT JOIN institutions i ON i.id = b.institution_id
        LEFT JOIN sessions s ON s.batch_id = b.id
        WHERE bs.student_id = $1
        GROUP BY b.id, i.name
        ORDER BY b.created_at DESC
      `, [userId]);
    } else if (role === 'institution') {
      result = await query(`
        SELECT b.*,
          i.name as institution_name,
          COUNT(DISTINCT bs.student_id) as student_count,
          COUNT(DISTINCT s.id) as session_count
        FROM batches b
        LEFT JOIN institutions i ON i.id = b.institution_id
        LEFT JOIN batch_students bs ON bs.batch_id = b.id
        LEFT JOIN sessions s ON s.batch_id = b.id
        WHERE b.institution_id = $1
        GROUP BY b.id, i.name
        ORDER BY b.created_at DESC
      `, [institution_id_fk]);
    } else {
      // programme_manager, monitoring_officer — see all
      result = await query(`
        SELECT b.*,
          i.name as institution_name,
          COUNT(DISTINCT bs.student_id) as student_count,
          COUNT(DISTINCT s.id) as session_count
        FROM batches b
        LEFT JOIN institutions i ON i.id = b.institution_id
        LEFT JOIN batch_students bs ON bs.batch_id = b.id
        LEFT JOIN sessions s ON s.batch_id = b.id
        GROUP BY b.id, i.name
        ORDER BY b.created_at DESC
      `);
    }

    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

/**
 * POST /api/batches/:id/invite
 * Trainer regenerates invite link for a batch
 */
router.post('/:id/invite', requireAuth, requireRole(['trainer', 'institution']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Verify trainer owns this batch
    if (role === 'trainer') {
      const check = await query(
        'SELECT 1 FROM batch_trainers WHERE batch_id = $1 AND trainer_id = $2',
        [id, userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this batch' });
      }
    }

    const inviteCode = nanoid(10).toUpperCase();
    const result = await query(
      'UPDATE batches SET invite_code = $1 WHERE id = $2 RETURNING id, name, invite_code',
      [inviteCode, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const inviteLink = `${process.env.FRONTEND_URL}/join/${result.rows[0].invite_code}`;
    res.json({ invite_code: inviteCode, invite_link: inviteLink, batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

/**
 * POST /api/batches/:id/join
 * Student joins batch via invite code
 * Body: { invite_code }
 */
router.post('/:id/join', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { id } = req.params;
    const { invite_code } = req.body;

    const batch = await query(
      'SELECT * FROM batches WHERE id = $1 AND invite_code = $2',
      [id, invite_code]
    );

    if (batch.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid batch or invite code' });
    }

    await query(`
      INSERT INTO batch_students (batch_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [id, req.user.id]);

    res.json({ message: 'Successfully joined batch', batch: batch.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join batch' });
  }
});

/**
 * GET /api/batches/join/:code
 * Look up batch by invite code (used on join page)
 */
router.get('/join/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await query(`
      SELECT b.id, b.name, b.invite_code, i.name as institution_name,
        COUNT(bs.student_id) as student_count
      FROM batches b
      LEFT JOIN institutions i ON i.id = b.institution_id
      LEFT JOIN batch_students bs ON bs.batch_id = b.id
      WHERE b.invite_code = $1
      GROUP BY b.id, i.name
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    res.json({ batch: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to look up batch' });
  }
});

/**
 * GET /api/batches/:id/summary
 * Institution / PM / MO: attendance summary for a batch
 */
router.get('/:id/summary', requireAuth, requireRole(['institution', 'programme_manager', 'monitoring_officer', 'trainer']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.session_id END) as present,
        COUNT(DISTINCT CASE WHEN a.status = 'late' THEN a.session_id END) as late,
        COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.session_id END) as absent,
        ROUND(
          100.0 * COUNT(DISTINCT CASE WHEN a.status IN ('present','late') THEN a.session_id END) 
          / NULLIF(COUNT(DISTINCT s.id), 0), 1
        ) as attendance_pct
      FROM batch_students bs
      JOIN users u ON u.id = bs.student_id
      CROSS JOIN (SELECT id FROM sessions WHERE batch_id = $1) s
      LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
      WHERE bs.batch_id = $1
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `, [id]);

    const batchInfo = await query(`
      SELECT b.name, i.name as institution_name
      FROM batches b
      LEFT JOIN institutions i ON i.id = b.institution_id
      WHERE b.id = $1
    `, [id]);

    res.json({
      batch: batchInfo.rows[0] || {},
      students: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
