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
      -- status is the device-CONFIRMED state (only ever written by
      -- /device/sync from what the device itself reports) - 'opening'/
      -- 'closing' are the in-progress callback states, 'open'/'closed' are
      -- only reached once the device reports the move actually finished.
      -- desired_status is what a user last asked for (browser button or a
      -- schedule) - the device polls this and decides for itself whether/
      -- when to act on it, exactly like a local button press does.
      status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'opening', 'closing')),
      desired_status TEXT NOT NULL DEFAULT 'closed' CHECK (desired_status IN ('open', 'closed')),
      last_seen_at BIGINT,
      owner_uid TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      shared_with TEXT[] NOT NULL DEFAULT '{}'
    );

    -- Idempotent upgrade path for a devices table that already existed
    -- before desired_status/the wider status CHECK were introduced.
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS desired_status TEXT NOT NULL DEFAULT 'closed';
    ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
    ALTER TABLE devices ADD CONSTRAINT devices_status_check CHECK (status IN ('open', 'closed', 'opening', 'closing'));
    ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_desired_status_check;
    ALTER TABLE devices ADD CONSTRAINT devices_desired_status_check CHECK (desired_status IN ('open', 'closed'));

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
