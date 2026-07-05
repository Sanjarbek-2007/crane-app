import "dotenv/config";
import { randomUUID } from "crypto";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { requireAuth } from "./auth";
import { migrate, pool } from "./db";
import { safeHashEqual, sha256 } from "./hash";
import { startScheduler } from "./scheduler";

const PORT = Number(process.env.PORT || 8092);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(express.json());

// Only the browser-invoked /api/* routes need CORS - /device/sync is never
// called from a browser so it's mounted with no CORS handling at all.
// `callback(null, false)` (not an Error) - CORS is enforced by the browser
// withholding the response from JS when headers are missing; throwing here
// would just surface as an unhandled 500 with a stack trace.
const apiCors = cors({
  origin: (origin, callback) => {
    callback(null, !origin || ALLOWED_ORIGINS.includes(origin));
  },
});

function hasDeviceAccess(device: any, uid: string, email: string): boolean {
  return device.owner_uid === uid || (device.shared_with as string[]).includes(email);
}

// Express 4 doesn't catch rejected promises from async handlers - without
// this, a thrown/rejected error inside a route would just hang the request
// with no response instead of reaching the error-handling middleware below.
type AsyncHandler = (req: Request, res: Response) => Promise<void>;
function h(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ---- Device provisioning / claim (browser, authenticated) ----

app.post("/api/devices/claim", apiCors, requireAuth, h(async (req, res) => {
  const claimCode = String(req.body?.claimCode || "").trim();
  if (!claimCode) {
    res.status(400).json({ error: "claimCode is required" });
    return;
  }

  const { uid, email } = req.user!;
  const codeHash = sha256(claimCode);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const secretRes = await client.query(
      `SELECT serial_number FROM device_secrets WHERE claim_code_hash = $1 AND claim_code_used = false FOR UPDATE`,
      [codeHash]
    );
    if (secretRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "invalid or already-used claim code" });
      return;
    }

    const serial = secretRes.rows[0].serial_number as string;
    const deviceId = randomUUID();
    const now = Date.now();

    await client.query(
      `INSERT INTO devices (id, serial_number, name, status, last_seen_at, owner_uid, owner_email, shared_with)
       VALUES ($1, $2, $3, 'closed', $4, $5, $6, '{}')`,
      [deviceId, serial, `Crane ${serial}`, now, uid, email]
    );
    await client.query(
      `UPDATE device_secrets SET claim_code_used = true, claimed_at = $1, claimed_by_uid = $2, device_id = $3 WHERE serial_number = $4`,
      [now, uid, deviceId, serial]
    );

    await client.query("COMMIT");
    res.json({ deviceId, serial_number: serial });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "internal error" });
  } finally {
    client.release();
  }
}));

// ---- Devices ----

app.get("/api/devices", apiCors, requireAuth, h(async (req, res) => {
  const { uid, email } = req.user!;
  const result = await pool.query(`SELECT * FROM devices WHERE owner_uid = $1 OR $2 = ANY(shared_with)`, [uid, email]);
  res.json(result.rows);
}));

app.patch("/api/devices/:id", apiCors, requireAuth, h(async (req, res) => {
  const { uid, email } = req.user!;
  const status = req.body?.status;
  if (status !== "open" && status !== "closed") {
    res.status(400).json({ error: "status must be 'open' or 'closed'" });
    return;
  }

  const deviceRes = await pool.query(`SELECT * FROM devices WHERE id = $1`, [req.params.id]);
  if (deviceRes.rows.length === 0) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const device = deviceRes.rows[0];
  if (!hasDeviceAccess(device, uid, email)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const now = Date.now();
  await pool.query(`UPDATE devices SET status = $1, last_seen_at = $2 WHERE id = $3`, [status, now, device.id]);
  await pool.query(
    `INSERT INTO logs (id, device_id, device_name, action, source, issued_by, created_at, related_emails)
     VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7)`,
    [randomUUID(), device.id, device.name, status, email, now, [device.owner_email, ...device.shared_with]]
  );

  res.json({ ...device, status, last_seen_at: now });
}));

app.post("/api/devices/:id/share", apiCors, requireAuth, h(async (req, res) => {
  const { uid } = req.user!;
  const emailToShare = String(req.body?.email || "").trim();
  if (!emailToShare) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const deviceRes = await pool.query(`SELECT * FROM devices WHERE id = $1`, [req.params.id]);
  if (deviceRes.rows.length === 0) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const device = deviceRes.rows[0];
  if (device.owner_uid !== uid) {
    res.status(403).json({ error: "only the owner can share this device" });
    return;
  }

  if (!device.shared_with.includes(emailToShare)) {
    const newShared = [...device.shared_with, emailToShare];
    await pool.query(`UPDATE devices SET shared_with = $1 WHERE id = $2`, [newShared, device.id]);
  }
  res.json({ ok: true });
}));

app.delete("/api/devices/:id/share", apiCors, requireAuth, h(async (req, res) => {
  const { uid } = req.user!;
  const emailToRemove = String(req.body?.email || "").trim();

  const deviceRes = await pool.query(`SELECT * FROM devices WHERE id = $1`, [req.params.id]);
  if (deviceRes.rows.length === 0) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const device = deviceRes.rows[0];
  if (device.owner_uid !== uid) {
    res.status(403).json({ error: "only the owner can modify sharing" });
    return;
  }

  const newShared = (device.shared_with as string[]).filter((e) => e !== emailToRemove);
  await pool.query(`UPDATE devices SET shared_with = $1 WHERE id = $2`, [newShared, device.id]);
  res.json({ ok: true });
}));

app.delete("/api/devices/:id", apiCors, requireAuth, h(async (req, res) => {
  const { uid } = req.user!;
  const deviceRes = await pool.query(`SELECT * FROM devices WHERE id = $1`, [req.params.id]);
  if (deviceRes.rows.length === 0) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  if (deviceRes.rows[0].owner_uid !== uid) {
    res.status(403).json({ error: "only the owner can delete this device" });
    return;
  }
  await pool.query(`DELETE FROM devices WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

// ---- Logs (read-only) ----

app.get("/api/logs", apiCors, requireAuth, h(async (req, res) => {
  const { email } = req.user!;
  const result = await pool.query(`SELECT * FROM logs WHERE $1 = ANY(related_emails) ORDER BY created_at DESC`, [email]);
  res.json(result.rows);
}));

// ---- Schedules ----

app.get("/api/schedules", apiCors, requireAuth, h(async (req, res) => {
  const { email } = req.user!;
  const result = await pool.query(`SELECT * FROM schedules WHERE $1 = ANY(related_emails) ORDER BY scheduled_at ASC`, [email]);
  res.json(result.rows);
}));

app.post("/api/schedules", apiCors, requireAuth, h(async (req, res) => {
  const { uid, email } = req.user!;
  const { device_id, action, scheduled_at } = req.body || {};
  if ((action !== "open" && action !== "closed") || !device_id || !Number.isFinite(scheduled_at)) {
    res.status(400).json({ error: "device_id, action ('open'|'closed'), and scheduled_at (ms) are required" });
    return;
  }

  const deviceRes = await pool.query(`SELECT * FROM devices WHERE id = $1`, [device_id]);
  if (deviceRes.rows.length === 0) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const device = deviceRes.rows[0];
  if (!hasDeviceAccess(device, uid, email)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const id = randomUUID();
  const relatedEmails = [device.owner_email, ...device.shared_with];
  await pool.query(
    `INSERT INTO schedules (id, device_id, device_name, action, scheduled_at, status, created_by, related_emails)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
    [id, device.id, device.name, action, scheduled_at, email, relatedEmails]
  );
  res.json({ id });
}));

app.delete("/api/schedules/:id", apiCors, requireAuth, h(async (req, res) => {
  const { email } = req.user!;
  const result = await pool.query(`SELECT * FROM schedules WHERE id = $1`, [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: "schedule not found" });
    return;
  }
  if (!(result.rows[0].related_emails as string[]).includes(email)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  await pool.query(`DELETE FROM schedules WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

// ---- Device-facing sync (plain GET, secret-based auth, no CORS) ----
//
// Designed for an Arduino that can only do AT-command-driven HTTP GET over
// a slow GPRS link - no JSON body, no headers, no Firebase Auth. The
// device's own `pos` report is stored for diagnostics only and never
// written into `status`: `status` is the desired value set by the browser
// or a schedule, and letting a stale device report clobber it on the next
// poll would race against a command that was just issued.

app.get("/device/sync", h(async (req, res) => {
  const serial = String(req.query.serial || "");
  const secret = String(req.query.secret || "");
  const pos = String(req.query.pos || "");

  if (!serial || !secret || !pos) {
    res.status(400).send("bad request");
    return;
  }

  const secretRes = await pool.query(`SELECT * FROM device_secrets WHERE serial_number = $1`, [serial]);
  if (secretRes.rows.length === 0) {
    res.status(403).send("forbidden");
    return;
  }
  const secretRow = secretRes.rows[0];
  if (!safeHashEqual(secretRow.device_api_secret_hash, sha256(secret))) {
    res.status(403).send("forbidden");
    return;
  }

  const now = Date.now();
  await pool.query(`UPDATE device_secrets SET last_sync_at = $1, last_reported_pos = $2 WHERE serial_number = $3`, [
    now,
    pos,
    serial,
  ]);

  if (!secretRow.device_id) {
    res.status(200).type("text/plain").send("closed");
    return;
  }

  const deviceRes = await pool.query(`SELECT status FROM devices WHERE id = $1`, [secretRow.device_id]);
  if (deviceRes.rows.length === 0) {
    res.status(200).type("text/plain").send("closed");
    return;
  }

  await pool.query(`UPDATE devices SET last_seen_at = $1 WHERE id = $2`, [now, secretRow.device_id]);
  res.status(200).type("text/plain").send(deviceRes.rows[0].status);
}));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Final error handler - never leak stack traces/internal details to the
// client, regardless of NODE_ENV or which layer (route, CORS check,
// middleware) the error came from.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal error" });
});

migrate()
  .then(() => {
    startScheduler();
    app.listen(PORT, () => console.log(`crane-api listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("failed to migrate database", err);
    process.exit(1);
  });
