import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  return admin.auth();
}

export { admin };
