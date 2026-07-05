import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID as string;

// Verifies the Google-signed ID token issued by Firebase Auth's Google
// sign-in (the frontend keeps using Firebase Auth purely for the Google
// login UX) using Google's public JWKS - no firebase-admin SDK, no service
// account, no Firestore/Functions dependency at all.
const client = jwksClient({
  jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  cache: true,
  cacheMaxAge: 6 * 60 * 60 * 1000, // Google rotates these keys infrequently
  rateLimit: true,
});

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err || new Error("signing key not found"));
      resolve(key.getPublicKey());
    });
  });
}

export interface AuthedUser {
  uid: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  const token = match[1];

  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header?.kid;
    if (!kid || typeof decodedHeader?.payload !== "object") {
      res.status(401).json({ error: "invalid token" });
      return;
    }

    const publicKey = await getSigningKey(kid);
    const payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    }) as jwt.JwtPayload;

    if (!payload.sub || !payload.email) {
      res.status(401).json({ error: "token missing sub/email" });
      return;
    }
    if (payload.email_verified === false) {
      res.status(403).json({ error: "email not verified" });
      return;
    }

    req.user = { uid: payload.sub, email: payload.email as string };
    next();
  } catch (err) {
    res.status(401).json({ error: "token verification failed" });
  }
}
