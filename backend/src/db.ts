import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      serial_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
      last_seen_at BIGINT,
      owner_uid TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      shared_with TEXT[] NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS device_secrets (
      serial_number TEXT PRIMARY KEY,
      claim_code_hash TEXT NOT NULL,
      claim_code_used BOOLEAN NOT NULL DEFAULT false,
      device_api_secret_hash TEXT NOT NULL,
      device_id TEXT REFERENCES devices(id),
      provisioned_at BIGINT NOT NULL,
      claimed_at BIGINT,
      claimed_by_uid TEXT,
      last_sync_at BIGINT,
      last_reported_pos TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('open', 'closed')),
      source TEXT NOT NULL CHECK (source IN ('manual', 'schedule')),
      issued_by TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      related_emails TEXT[] NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('open', 'closed')),
      scheduled_at BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed')),
      created_by TEXT NOT NULL,
      related_emails TEXT[] NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_logs_related_emails ON logs USING GIN (related_emails);
    CREATE INDEX IF NOT EXISTS idx_schedules_related_emails ON schedules USING GIN (related_emails);
    CREATE INDEX IF NOT EXISTS idx_devices_shared_with ON devices USING GIN (shared_with);
  `);
}
