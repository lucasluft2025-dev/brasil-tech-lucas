import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const ADMIN_EMAIL = 'lucasluft2025@gmail.com';
export const ADMIN_EMAILS = [
  'brasilgames@gmail.com',
  'lucasluft2025@gmail.com',
  'luft446@gmail.com',
];
export const PRIMARY_ADMIN_LOGIN_EMAIL = 'brasilgames@gmail.com';

const ADMIN_SESSION_SALT = 'BT_OWNER_GUARD_2026_V2';

function computeOwnerSessionDigest(email: string, keySecret: string): string {
  const input = `${ADMIN_SESSION_SALT}::${email.trim().toLowerCase()}::${keySecret}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = (Math.imul(h2 ^ code, 2246822519) + i) >>> 0;
  }
  return `btadm_${h1.toString(36)}_${h2.toString(36)}`;
}

const EXPECTED_PASSWORD_SESSION_TOKEN = computeOwnerSessionDigest(
  PRIMARY_ADMIN_LOGIN_EMAIL,
  'Adriana2026'
);

export function validateAdminPasswordLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === PRIMARY_ADMIN_LOGIN_EMAIL &&
    password === 'Adriana2026'
  );
}

export function createVerifiedAdminSessionToken(email: string, password: string): string | null {
  if (!validateAdminPasswordLogin(email, password)) return null;
  return EXPECTED_PASSWORD_SESSION_TOKEN;
}

export function isValidAdminSessionToken(token: string | null | undefined): boolean {
  return Boolean(token && token === EXPECTED_PASSWORD_SESSION_TOKEN);
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Always bind explicitly to the provisioned named Firestore database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isBootstrappedAdminUser(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  return Boolean(
    email && ADMIN_EMAILS.includes(email.toLowerCase()) && emailVerified === true
  );
}

let connectionTested = false;

export async function testConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
