import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))

async function seed() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })

  try {
    const sql = readFileSync(join(__dirname, "seed.sql"), "utf8")
    await pool.query(sql)
    console.log("Database seeded successfully!")
    console.log("Inserted patients + vitals_log records.")
  } catch (err) {
    console.error("Seed failed:", err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
