type Role = 'admin' | 'owner';

interface UserCredential {
  username: string;
  password: string;
}

const SESSION_COOKIE_NAME = 'mi_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Parse user credentials from environment variable.
 * Mirrors the pattern used in the monaghans repo:
 * - JSON object: ADMIN_USER='{"username":"admin","password":"pass"}'
 * - JSON array: ADMIN_USERS='[{"username":"admin","password":"pass"}]'
 * - Colon separated: ADMIN_USERS="user1:pass1,user2:pass2"
 */
function parseUserCredentials(envVar: string | undefined): UserCredential[] {
  if (!envVar) return [];

  // First try JSON format
  try {
    const parsed = JSON.parse(envVar);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (cred): cred is UserCredential =>
          cred &&
          typeof cred === 'object' &&
          typeof cred.username === 'string' &&
          typeof cred.password === 'string',
      );
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as any).username === 'string' &&
      typeof (parsed as any).password === 'string'
    ) {
      return [parsed as UserCredential];
    }
  } catch {
    // Not JSON, try colon-separated format: "username1:password1,username2:password2"
    const credentials = envVar
      .split(',')
      .map((pair) => {
        const [username, password] = pair.split(':').map((s) => s.trim());
        if (username && password) {
          return { username, password };
        }
        return null;
      })
      .filter((cred): cred is UserCredential => cred !== null);

    if (credentials.length > 0) {
      return credentials;
    }
  }

  return [];
}

function getAllRoleCredentials(): { admin: UserCredential[]; owner: UserCredential[] } {
  const adminUser = parseUserCredentials(process.env.ADMIN_USER);
  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS);
  const ownerUser = parseUserCredentials(process.env.OWNER_USER);
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS);

  const result = {
    admin: [...adminUser, ...adminUsers],
    owner: [...ownerUser, ...ownerUsers],
  };

  if (process.env.NODE_ENV === 'production') {
    const hasAny = result.admin.length > 0 || result.owner.length > 0;
    if (!hasAny) {
      throw new Error(
        'At least one ADMIN_USER / ADMIN_USERS or OWNER_USER / OWNER_USERS must be configured in production.',
      );
    }
  }

  return result;
}

export function checkCredentials(
  username: string,
  password: string,
): { role: Role; matchedUsername: string } | null {
  const all = getAllRoleCredentials();

  for (const cred of all.admin) {
    if (cred.username.trim() === username.trim() && cred.password === password) {
      return { role: 'admin', matchedUsername: cred.username };
    }
  }

  for (const cred of all.owner) {
    if (cred.username.trim() === username.trim() && cred.password === password) {
      return { role: 'owner', matchedUsername: cred.username };
    }
  }

  return null;
}

/**
 * Check if an email is an admin (for Google OAuth in production).
 * ADMIN_EMAILS: comma-separated, e.g. "jtomassoni@gmail.com,other@example.com"
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const list = process.env.ADMIN_EMAILS ?? '';
  const emails = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return emails.includes(email.trim().toLowerCase());
}
