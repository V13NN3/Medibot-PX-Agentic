import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
})

const statements = [
  `CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES queue_tickets(id),
    formatted_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    doctor_id UUID REFERENCES doctors(id),
    medications JSONB NOT NULL DEFAULT '[]',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
]

try {
  for (const sql of statements) {
    await pool.query(sql)
    console.log(`OK: ${sql.slice(0, 60)}...`)
  }
  console.log("Migration complete.")
} catch (err) {
  console.error("Migration failed:", err)
  process.exitCode = 1
} finally {
  await pool.end()
}
