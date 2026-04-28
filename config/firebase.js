import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount;

try {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '../serviceAccountKey.json');
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
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
