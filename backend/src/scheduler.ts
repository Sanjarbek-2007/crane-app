import { randomUUID } from "crypto";
import { pool } from "./db";

// Server-side replacement for the old frontend "cron job" (a client-side
// setInterval that only ran while some user's browser tab happened to be
// open). This runs continuously as long as the backend process is up.
const CHECK_INTERVAL_MS = 5000;

export function startScheduler(): void {
  setInterval(runDueSchedules, CHECK_INTERVAL_MS);
}

async function runDueSchedules(): Promise<void> {
  const now = Date.now();
  const client = await pool.connect();
  try {
    const due = await client.query(
      `SELECT id, device_id, device_name, action, created_by, related_emails
       FROM schedules WHERE status = 'pending' AND scheduled_at <= $1`,
      [now]
    );

    for (const schedule of due.rows) {
      await client.query("BEGIN");
      try {
        const updated = await client.query(
          `UPDATE schedules SET status = 'executed' WHERE id = $1 AND status = 'pending'`,
          [schedule.id]
        );
        if (updated.rowCount === 0) {
          // Already handled by a previous tick - nothing to do.
          await client.query("ROLLBACK");
          continue;
        }

        const deviceRes = await client.query(`SELECT id FROM devices WHERE id = $1`, [schedule.device_id]);
        if (deviceRes.rows.length === 0) {
          await client.query("COMMIT");
          continue;
        }

        // Sets desired_status only, same as a manual button press - the
        // device is the one that confirms it via /device/sync once it
        // actually starts and finishes moving.
        await client.query(`UPDATE devices SET desired_status = $1 WHERE id = $2`, [
          schedule.action,
          schedule.device_id,
        ]);

        await client.query(
          `INSERT INTO logs (id, device_id, device_name, action, source, issued_by, created_at, related_emails)
           VALUES ($1, $2, $3, $4, 'schedule', $5, $6, $7)`,
          [randomUUID(), schedule.device_id, schedule.device_name, schedule.action, schedule.created_by, now, schedule.related_emails]
        );

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("scheduler: failed to execute schedule", schedule.id, err);
      }
    }
  } catch (err) {
    console.error("scheduler: tick failed", err);
  } finally {
    client.release();
  }
}
