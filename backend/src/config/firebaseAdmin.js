import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdminConfigured = false;

try {
  const base64Credentials = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  let serviceAccount = null;

  if (base64Credentials) {
    const jsonString = Buffer.from(
      base64Credentials,
      "base64"
    ).toString("utf8");
    serviceAccount = JSON.parse(jsonString);
  } else {
    const localKeyPath = path.resolve(__dirname, "../../serviceAccountKey.json");
    if (fs.existsSync(localKeyPath)) {
      const fileContent = fs.readFileSync(localKeyPath, "utf8");
      serviceAccount = JSON.parse(fileContent);
    }
  }

  if (serviceAccount) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    firebaseAdminConfigured = true;

    console.log(
      "[AUTH] Firebase Admin SDK initialized successfully."
    );
  } else {
    console.warn(
      "[AUTH] FIREBASE_SERVICE_ACCOUNT_BASE64 is missing."
    );
  }
} catch (error) {
  console.error(
    "[AUTH] Firebase Admin SDK initialization failed:",
    error.message
  );
}

export async function verifyFirebasePhoneToken(idToken, phone) {
  if (!firebaseAdminConfigured) {
    console.warn(
      "[AUTH] Firebase Admin SDK is not configured. " +
      "Allowing dev phone verification mode for testing."
    );

    return {
      phone_number: phone,
      devMode: true,
    };
  }

  const decodedToken = await getAuth().verifyIdToken(idToken);

  if (
    !decodedToken.phone_number ||
    decodedToken.phone_number !== phone
  ) {
    const error = new Error(
      "The verified phone number does not match the submitted phone number."
    );

    error.status = 400;
    throw error;
  }

  return decodedToken;
}