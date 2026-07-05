// Local provisioning tool - NOT deployed, NOT exposed on the internet.
// Run this yourself once per physical device, before it ships/is installed:
//
//   cd functions
//   npm install
//   npm run provision -- CRN-10492
//
// Requires a Firebase service-account key saved at functions/service-account.json
// (Firebase console -> Project Settings -> Service Accounts -> Generate new
// private key). That file is gitignored and must never be committed.
//
// Prints a one-time human claim code and a long-lived device API secret.
// Only their SHA-256 hashes are stored in Firestore - neither value can be
// recovered again after this script exits, so save them now:
//   - claim code  -> goes on the paperwork/sticker handed to the buyer
//   - device secret -> gets flashed into that unit's Arduino sketch

import * as crypto from "crypto";
import * as path from "path";
import * as admin from "firebase-admin";

function randomToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function main() {
  const serial = process.argv[2];
  if (!serial) {
    console.error("Usage: npm run provision -- <SERIAL_NUMBER>");
    console.error("Example: npm run provision -- CRN-10492");
    process.exit(1);
  }

  const serviceAccountPath = path.join(__dirname, "..", "service-account.json");
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
  const db = admin.firestore();

  const existing = await db.collection("device_secrets").doc(serial).get();
  if (existing.exists) {
    console.error(`device_secrets/${serial} already exists - refusing to overwrite.`);
    console.error("Delete it manually first if you really want to re-provision this serial.");
    process.exit(1);
  }

  const claimCodeSuffix = randomToken(6).replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
  const claimCode = `${serial}-${claimCodeSuffix}`;
  const deviceApiSecret = randomToken(32);

  await db.collection("device_secrets").doc(serial).set({
    serial_number: serial,
    claim_code_hash: sha256(claimCode),
    claim_code_used: false,
    device_api_secret_hash: sha256(deviceApiSecret),
    device_id: null,
    provisioned_at: Date.now(),
    claimed_at: null,
    claimed_by_uid: null,
    last_sync_at: null,
    last_reported_pos: null,
  });

  console.log("");
  console.log(`Provisioned device_secrets/${serial}`);
  console.log("");
  console.log(`  Claim code (give to the buyer, enter once in the app):`);
  console.log(`    ${claimCode}`);
  console.log("");
  console.log(`  Device API secret (flash into this unit's Arduino sketch, keep private):`);
  console.log(`    ${deviceApiSecret}`);
  console.log("");
  console.log("Neither value is recoverable again - only their hashes were saved.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
