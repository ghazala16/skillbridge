const { clerkClient } = require('@clerk/clerk-sdk-node');

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db/pool');

/**
 * POST /api/users/sync
 * Called after Clerk login to create/sync user in our DB
 * Body: { clerk_user_id, name, email, role }
 */
// router.post('/sync', async (req, res) => {
//   try {
//     const { clerk_user_id, name, email, role } = req.body;

//     const validRoles = ['student', 'trainer', 'institution', 'programme_manager', 'monitoring_officer'];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({ error: 'Invalid role' });
//     }

//     if (!clerk_user_id || !name || !email) {
//       return res.status(400).json({ error: 'Missing required fields: clerk_user_id, name, email' });
//     }

//     // Upsert user
//     const result = await query(`
//       INSERT INTO users (clerk_user_id, name, email, role)
//       VALUES ($1, $2, $3, $4)
//       ON CONFLICT (clerk_user_id)
//       DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
//       RETURNING *
//     `, [clerk_user_id, name, email, role]);

//     res.json({ user: result.rows[0] });
//   } catch (err) {
//     console.error('User sync error:', err);
//     res.status(500).json({ error: 'Failed to sync user' });
//   }
// });


router.post('/sync', async (req, res) => {
  try {
    const { clerk_user_id, name, email, role } = req.body;

    const validRoles = ['student', 'trainer', 'institution', 'programme_manager', 'monitoring_officer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!clerk_user_id || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields: clerk_user_id, name, email' });
    }

    // 🔥 1. Update Clerk metadata (THIS FIXES YOUR ERROR)
    await clerkClient.users.updateUser(clerk_user_id, {
      publicMetadata: { role },
    });

    // 🔥 2. Upsert user in your DB
    const result = await query(`
      INSERT INTO users (clerk_user_id, name, email, role, institution_id_fk)
  VALUES ($1, $2, $3, $4,
    CASE 
      WHEN $4 = 'institution' THEN (
        SELECT id FROM institutions ORDER BY created_at DESC LIMIT 1
      )
      ELSE NULL
    END
  )
  ON CONFLICT (clerk_user_id)
  DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
  RETURNING *
`, [clerk_user_id, name, email, role]);
    res.json({ user: result.rows[0] });

    let user = result.rows[0];


// 🔥 ADD THIS BLOCK HERE 👇
if (role !== 'institution') {
  const inst = await query(`
    SELECT institution_id_fk 
    FROM users 
    WHERE role = 'institution' 
    AND institution_id_fk IS NOT NULL 
    LIMIT 1
  `);

  if (inst.rows.length > 0) {
    await query(`
      UPDATE users
      SET institution_id_fk = $1
      WHERE id = $2
    `, [inst.rows[0].institution_id_fk, user.id]);

    user.institution_id_fk = inst.rows[0].institution_id_fk;
  }
}

res.json({ user });

  } catch (err) {
    console.error('User sync error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

/**
 * GET /api/users/me
 * Returns current user's profile
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * GET /api/users/trainers
 * Institution: list trainers in their institution
 */
router.get('/trainers', requireAuth, async (req, res) => {
  try {
    const { role, institution_id_fk } = req.user;
    if (!['institution', 'programme_manager', 'monitoring_officer'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let result;
    if (role === 'institution') {
      result = await query(`
        SELECT u.id, u.name, u.email, u.created_at,
          COUNT(DISTINCT bt.batch_id) as batch_count
        FROM users u
        LEFT JOIN batch_trainers bt ON bt.trainer_id = u.id
        LEFT JOIN batches b ON b.id = bt.batch_id
        WHERE u.role = 'trainer'
          AND (b.institution_id = $1 OR b.institution_id IS NULL)
        GROUP BY u.id
        ORDER BY u.name
      `, [institution_id_fk]);
    } else {
      result = await query(`
        SELECT u.id, u.name, u.email, u.created_at,
          COUNT(DISTINCT bt.batch_id) as batch_count
        FROM users u
        LEFT JOIN batch_trainers bt ON bt.trainer_id = u.id
        WHERE u.role = 'trainer'
        GROUP BY u.id
        ORDER BY u.name
      `);
    }

    res.json({ trainers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

module.exports = router;
