export const PRIMARY_ADMIN_LOGIN_EMAIL = 'brasilgames@gmail.com';
export const ADMIN_EMAILS = [
  'brasilgames@gmail.com',
  'lucasluft2025@gmail.com',
  'luft446@gmail.com',
];

const ADMIN_SESSION_SALT = 'BT_OWNER_GUARD_2026_V2';

export function computeOwnerSessionDigest(email: string, keySecret: string): string {
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

export function getExpectedAdminSessionToken(): string {
  return EXPECTED_PASSWORD_SESSION_TOKEN;
}

export function isBootstrappedAdminEmail(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  return Boolean(
    email && ADMIN_EMAILS.includes(email.trim().toLowerCase()) && emailVerified === true
  );
}
