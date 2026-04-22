const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db/pool');

/**
 * GET /api/institutions
 * List all institutions
 */
router.get('/', requireAuth, requireRole(['programme_manager', 'monitoring_officer', 'institution']), async (req, res) => {
  try {
    const result = await query(`
      SELECT i.*,
        COUNT(DISTINCT b.id) as batch_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'trainer') as trainer_count,
        COUNT(DISTINCT bs.student_id) as student_count
      FROM institutions i
      LEFT JOIN batches b ON b.institution_id = i.id
      LEFT JOIN users u ON u.institution_id_fk = i.id
      LEFT JOIN batch_students bs ON bs.batch_id = b.id
      GROUP BY i.id
      ORDER BY i.name
    `);
    res.json({ institutions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

/**
 * POST /api/institutions
 * Create institution (for setup / admin)
 */
router.post('/', requireAuth, requireRole(['programme_manager']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Institution name required' });

    const result = await query(
      'INSERT INTO institutions (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json({ institution: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create institution' });
  }
});

/**
 * GET /api/institutions/:id/summary
 * Programme Manager: attendance across all batches in an institution
 */


/**
 * GET /api/programme/summary
 * Programme Manager / Monitoring Officer: programme-wide view
 */
router.get('/programme/summary', requireAuth, requireRole(['programme_manager', 'monitoring_officer']), async (req, res) => {
  try {
    const overall = await query(`
      SELECT
        COUNT(DISTINCT i.id) as total_institutions,
        COUNT(DISTINCT b.id) as total_batches,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') as total_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'trainer') as total_trainers,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present') as total_present,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'late') as total_late,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'absent') as total_absent,
        COUNT(DISTINCT a.id) as total_marked
      FROM institutions i
      LEFT JOIN batches b ON b.institution_id = i.id
      LEFT JOIN sessions s ON s.batch_id = b.id
      LEFT JOIN attendance a ON a.session_id = s.id
      CROSS JOIN users u
    `);

    const byInstitution = await query(`
      SELECT 
        i.id,
        i.name,
        COUNT(DISTINCT b.id) as batch_count,
        COUNT(DISTINCT s.id) as session_count,
        COUNT(DISTINCT bs.student_id) as student_count,
        ROUND(
          100.0 * COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('present','late'))
          / NULLIF(COUNT(DISTINCT bs.student_id) * COUNT(DISTINCT s.id), 0), 1
        ) as attendance_pct
      FROM institutions i
      LEFT JOIN batches b ON b.institution_id = i.id
      LEFT JOIN batch_students bs ON bs.batch_id = b.id
      LEFT JOIN sessions s ON s.batch_id = b.id
      LEFT JOIN attendance a ON a.session_id = s.id
      GROUP BY i.id, i.name
      ORDER BY i.name
    `);

    res.json({
      overall: overall.rows[0],
      institutions: byInstitution.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch programme summary' });
  }
});


router.get('/:id/summary', requireAuth, requireRole(['programme_manager', 'monitoring_officer', 'institution']), async (req, res) => {
  try {
    const { id } = req.params;

    const batchSummary = await query(`
      SELECT 
        b.id as batch_id,
        b.name as batch_name,
        COUNT(DISTINCT bs.student_id) as total_students,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present') as present_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'late') as late_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'absent') as absent_count,
        ROUND(
          100.0 * COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('present','late'))
          / NULLIF(COUNT(DISTINCT bs.student_id) * COUNT(DISTINCT s.id), 0), 1
        ) as attendance_pct
      FROM batches b
      LEFT JOIN batch_students bs ON bs.batch_id = b.id
      LEFT JOIN sessions s ON s.batch_id = b.id
      LEFT JOIN attendance a ON a.session_id = s.id
      WHERE b.institution_id = $1
      GROUP BY b.id, b.name
      ORDER BY b.name
    `, [id]);

    const instInfo = await query('SELECT * FROM institutions WHERE id = $1', [id]);

    res.json({
      institution: instInfo.rows[0] || {},
      batches: batchSummary.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch institution summary' });
  }
});

module.exports = router;
