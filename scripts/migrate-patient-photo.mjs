import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
})

const statements = [
  `ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo TEXT`,
]

try {
  for (const sql of statements) {
    await pool.query(sql)
    console.log(`OK: ${sql}`)
  }
  console.log("Migration complete.")
} catch (err) {
  console.error("Migration failed:", err)
  process.exitCode = 1
} finally {
  await pool.end()
}
