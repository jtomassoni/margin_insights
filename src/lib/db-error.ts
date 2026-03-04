/**
 * Map Prisma/database errors to user-friendly messages for production.
 * Logs full error server-side; returns safe message to client.
 */
export function getDbErrorMessage(e: unknown, fallback: string): string {
  const err = e as { code?: string; message?: string };
  const code = err?.code;
  const message = err?.message ?? '';

  if (code === 'P1001' || message.includes("Can't reach database server")) {
    return 'Database unreachable. Check DATABASE_URL and use the pooled connection string for serverless (e.g. Neon: host with -pooler suffix).';
  }
  if (code === 'P1002' || message.includes('Connection timed out')) {
    return 'Database connection timed out. Ensure DATABASE_URL uses the pooled connection for Vercel/serverless.';
  }
  if (code === 'P1003') {
    return 'Database not found. Verify DATABASE_URL points to the correct database.';
  }
  if (message.includes('does not exist')) {
    return 'Database schema missing. Run: npx prisma migrate deploy';
  }
  if (code === 'P2002' || message.includes('Unique constraint')) {
    return 'A record with this value already exists.';
  }
  if (code === 'P2003' || message.includes('Foreign key constraint')) {
    return 'Invalid reference. The related record may have been deleted.';
  }

  return fallback;
}
