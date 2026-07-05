// Local provisioning tool - not exposed on the internet, not part of the
// running API server. Run this yourself once per physical device, before
// it ships/is installed:
//
//   cd backend
//   npm install
//   npm run provision -- CRN-10492
//
// Requires the same DATABASE_URL as the running API (see .env.example).
//
// Prints a one-time human claim code and a long-lived device API secret.
// Only their SHA-256 hashes are stored in Postgres - neither value can be
// recovered again after this script exits, so save them now:
//   - claim code     -> goes on the paperwork/sticker handed to the buyer
//   - device secret  -> gets flashed into that unit's Arduino sketch

import "dotenv/config";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { sha256 } from "../src/hash";

async function main() {
  const serial = process.argv[2];
  if (!serial) {
    console.error("Usage: npm run provision -- <SERIAL_NUMBER>");
    console.error("Example: npm run provision -- CRN-10492");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const existing = await pool.query(`SELECT 1 FROM device_secrets WHERE serial_number = $1`, [serial]);
  if (existing.rows.length > 0) {
    console.error(`device_secrets for ${serial} already exists - refusing to overwrite.`);
    console.error("Delete it manually first if you really want to re-provision this serial.");
    process.exit(1);
  }

  const claimCodeSuffix = randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
  const claimCode = `${serial}-${claimCodeSuffix}`;
  const deviceApiSecret = randomBytes(32).toString("base64url");

  await pool.query(
    `INSERT INTO device_secrets (serial_number, claim_code_hash, claim_code_used, device_api_secret_hash, device_id, provisioned_at)
     VALUES ($1, $2, false, $3, NULL, $4)`,
    [serial, sha256(claimCode), sha256(deviceApiSecret), Date.now()]
  );

  console.log("");
  console.log(`Provisioned device_secrets for ${serial}`);
  console.log("");
  console.log(`  Claim code (give to the buyer, enter once in the app):`);
  console.log(`    ${claimCode}`);
  console.log("");
  console.log(`  Device API secret (flash into this unit's Arduino sketch, keep private):`);
  console.log(`    ${deviceApiSecret}`);
  console.log("");
  console.log("Neither value is recoverable again - only their hashes were saved.");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
