import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeHashEqual(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/**
 * Browser-invoked. Validates a device's one-time claim code against the
 * device_secrets record a `provisionDevice` script run created ahead of
 * time, then creates the devices/ doc and marks the code used. Replaces the
 * old client-side stub that trusted any string as a valid claim code.
 */
export const claimDeviceCallable = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError("failed-precondition", "Account has no email.");
  }

  const claimCode = String(request.data?.claimCode || "").trim();
  if (!claimCode) {
    throw new HttpsError("invalid-argument", "claimCode is required.");
  }

  const codeHash = sha256(claimCode);
  const snap = await db.collection("device_secrets")
    .where("claim_code_hash", "==", codeHash)
    .where("claim_code_used", "==", false)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "Invalid or already-used claim code.");
  }

  const secretDoc = snap.docs[0];
  const serial = secretDoc.get("serial_number") as string;
  const now = Date.now();
  const deviceRef = db.collection("devices").doc();

  await db.runTransaction(async (tx) => {
    tx.set(deviceRef, {
      serial_number: serial,
      name: `Crane ${serial}`,
      status: "closed",
      last_seen_at: now,
      owner_uid: uid,
      owner_email: email,
      shared_with: [],
    });
    tx.update(secretDoc.ref, {
      claim_code_used: true,
      claimed_at: now,
      claimed_by_uid: uid,
      device_id: deviceRef.id,
    });
  });

  return { deviceId: deviceRef.id, serial_number: serial };
});

/**
 * Device-invoked. Plain GET, plain-text response - designed for an Arduino
 * that can only do AT-command-driven HTTP GET over a slow GPRS link, not
 * Firebase Auth or JSON bodies. Auth is a per-device secret (compared with
 * a constant-time hash comparison), not CORS - CORS only restricts browser
 * JS and does nothing against curl/an Arduino.
 *
 * The device's own `pos` report is stored for diagnostics only and never
 * written into the device's `status` field: `status` is the desired value
 * set by the browser/schedules, and letting a stale device report clobber
 * it on the next poll would race against a command the user just issued.
 */
export const deviceSync = onRequest({ region: "us-central1", cors: false }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("method not allowed");
    return;
  }

  const serial = String(req.query.serial || "");
  const secret = String(req.query.secret || "");
  const pos = String(req.query.pos || "");

  if (!serial || !secret || !pos) {
    res.status(400).send("bad request");
    return;
  }

  const secretRef = db.collection("device_secrets").doc(serial);
  const secretDoc = await secretRef.get();
  if (!secretDoc.exists) {
    res.status(403).send("forbidden");
    return;
  }

  const expectedHash = secretDoc.get("device_api_secret_hash") as string;
  if (!safeHashEqual(expectedHash, sha256(secret))) {
    res.status(403).send("forbidden");
    return;
  }

  const now = Date.now();
  await secretRef.update({ last_sync_at: now, last_reported_pos: pos });

  const deviceId = secretDoc.get("device_id") as string | null;
  if (!deviceId) {
    // Provisioned but not yet claimed by an owner - safe idle default.
    res.status(200).type("text/plain").send("closed");
    return;
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const deviceDoc = await deviceRef.get();
  if (!deviceDoc.exists) {
    res.status(200).type("text/plain").send("closed");
    return;
  }

  await deviceRef.update({ last_seen_at: now });
  const status = (deviceDoc.get("status") as string) || "closed";
  res.status(200).type("text/plain").send(status);
});
