/**
 * Signed cookie for post-signup redirect. Allows owner without businessSlug
 * to access /dashboard/{slug} once after creating their business.
 * Works in both Node (API) and Edge (middleware).
 */

const COOKIE_NAME = 'mi_signup_slug';
const MAX_AGE_SEC = 300; // 5 min

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSignupCookie(slug: string): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.APP_AUTH_SECRET;
  if (!secret) throw new Error('Auth secret not configured');

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const data = `${slug}.${exp}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const value = `${data}.${base64UrlEncode(sig)}`;

  return {
    name: COOKIE_NAME,
    value,
    options: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: MAX_AGE_SEC,
    },
  };
}

export async function verifySignupCookie(cookieValue: string, slug: string): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.APP_AUTH_SECRET;
  if (!secret) return false;

  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;
  const [cookieSlug, expStr, sigB64] = parts;
  if (cookieSlug !== slug) return false;

  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp < Date.now() / 1000) return false;

  const data = `${cookieSlug}.${expStr}`;
  const key = await getKey(secret);
  const sig = base64UrlDecode(sigB64);
  return crypto.subtle.verify('HMAC', key, sig as unknown as ArrayBuffer, new TextEncoder().encode(data));
}

export function getSignupCookieFromRequest(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export function clearSignupCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
