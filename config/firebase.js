import admin from 'firebase-admin';

let serviceAccount;

try {
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  if (!keyJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable not set');
  }
  serviceAccount = JSON.parse(keyJson);
} catch (error) {
  console.error('Error loading Firebase service account key:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
