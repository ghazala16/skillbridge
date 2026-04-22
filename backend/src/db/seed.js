require('dotenv').config();
const { pool, query } = require('./pool');

// This seed creates the institution record and links test users.
// Run AFTER you've signed up all 5 test accounts via the frontend
// and they appear in your Clerk dashboard.
//
// Usage: node src/db/seed.js

async function seed() {
  console.log('🌱 Seeding reference data...');

  try {
    // Create a test institution
    const instResult = await query(`
      INSERT INTO institutions (name)
      VALUES ('SkillBridge Demo Institute')
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `);

    let institutionId;
    if (instResult.rows.length > 0) {
      institutionId = instResult.rows[0].id;
    } else {
      const existing = await query(`SELECT id FROM institutions WHERE name = 'SkillBridge Demo Institute'`);
      institutionId = existing.rows[0].id;
    }

    console.log(`✅ Institution ID: ${institutionId}`);

    // Link all trainers and institution users to this institution
    await query(`
      UPDATE users
      SET institution_id_fk = $1
      WHERE role IN ('trainer', 'institution')
    `, [institutionId]);

    // Create a sample batch
    const batchResult = await query(`
      INSERT INTO batches (name, institution_id, invite_code)
      VALUES ('Batch A - Web Dev 2025', $1, 'BATCH-DEMO-001')
      ON CONFLICT (invite_code) DO NOTHING
      RETURNING id
    `, [institutionId]);

    if (batchResult.rows.length > 0) {
      const batchId = batchResult.rows[0].id;
      console.log(`✅ Batch ID: ${batchId}`);

      // Link trainer to batch
      const trainer = await query(`SELECT id FROM users WHERE role = 'trainer' LIMIT 1`);
      if (trainer.rows.length > 0) {
        await query(`
          INSERT INTO batch_trainers (batch_id, trainer_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [batchId, trainer.rows[0].id]);
        console.log('✅ Trainer linked to batch');

        // Create a sample session
        const sessionResult = await query(`
          INSERT INTO sessions (batch_id, trainer_id, title, date, start_time, end_time)
          VALUES ($1, $2, 'Introduction to Node.js', CURRENT_DATE, '09:00', '11:00')
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [batchId, trainer.rows[0].id]);

        if (sessionResult.rows.length > 0) {
          console.log(`✅ Session created: ${sessionResult.rows[0].id}`);
        }
      }

      // Link student to batch
      const student = await query(`SELECT id FROM users WHERE role = 'student' LIMIT 1`);
      if (student.rows.length > 0) {
        await query(`
          INSERT INTO batch_students (batch_id, student_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [batchId, student.rows[0].id]);
        console.log('✅ Student linked to batch');
      }
    }

    console.log('\n🎉 Seed complete! Your demo data is ready.');
    console.log(`   Invite code for students to join: BATCH-DEMO-001`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
