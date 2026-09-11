import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const serviceAccountPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../serviceAccountKey.json"
);

const serviceAccount = existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

const credential = serviceAccount || (
  projectId && clientEmail && privateKey
    ? { projectId, clientEmail, privateKey }
    : null
);

const firebaseAdminConfigured = Boolean(credential);

if (firebaseAdminConfigured && getApps().length === 0) {
  initializeApp({
    credential: cert(credential)
  });
}

export async function verifyFirebasePhoneToken(idToken, phone) {
  if (!firebaseAdminConfigured) {
    console.warn("[AUTH] Firebase Admin SDK is not configured. Allowing dev phone verification mode for testing.");
    return { phone_number: phone, devMode: true };
  }

  const decodedToken = await getAuth().verifyIdToken(idToken);
  if (!decodedToken.phone_number || decodedToken.phone_number !== phone) {
    const error = new Error("The verified phone number does not match the submitted phone number.");
    error.status = 400;
    throw error;
  }

  return decodedToken;
}