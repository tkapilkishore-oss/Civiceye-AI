import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
};

if (getApps().length === 0) {
  if (
    firebaseAdminConfig.projectId &&
    firebaseAdminConfig.clientEmail &&
    firebaseAdminConfig.privateKey
  ) {
    try {
      initializeApp({
        credential: cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
      });
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK with credentials:", error);
    }
  } else {
    // Graceful fallback for local development before credentials are fully populated in .env.local
    console.warn(
      "Firebase Admin credentials are not set. API routes will use fallback mock data."
    );
  }
}

// Check if we initialized successfully, otherwise return a stub or null
const dbAdmin = getApps().length > 0 ? getFirestore() : null;
const storageAdmin = getApps().length > 0 ? getStorage() : null;

export { dbAdmin, storageAdmin };
