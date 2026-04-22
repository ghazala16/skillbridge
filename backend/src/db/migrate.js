require('dotenv').config();
const { pool } = require('./pool');

const migrations = `
  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Users table (synced from Clerk)
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student','trainer','institution','programme_manager','monitoring_officer')),
    institution_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Institutions table
  CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Add FK from users to institutions after both tables exist
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS institution_id_fk UUID REFERENCES institutions(id);

  -- Batches
  CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    institution_id UUID REFERENCES institutions(id),
    invite_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Batch <-> Trainer (many-to-many)
  CREATE TABLE IF NOT EXISTS batch_trainers (
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (batch_id, trainer_id)
  );

  -- Batch <-> Student
  CREATE TABLE IF NOT EXISTS batch_students (
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (batch_id, student_id)
  );

  -- Sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Attendance
  CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('present','absent','late')),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_sessions_batch ON sessions(batch_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
  CREATE INDEX IF NOT EXISTS idx_batches_invite ON batches(invite_code);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');
    await client.query(migrations);
    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
