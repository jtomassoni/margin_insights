/**
 * Check if an email is an admin (for Google OAuth).
 * ADMIN_EMAILS: comma-separated, e.g. "jtomassoni@gmail.com,other@example.com"
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const list = process.env.ADMIN_EMAILS ?? '';
  const emails = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return emails.includes(email.trim().toLowerCase());
}
