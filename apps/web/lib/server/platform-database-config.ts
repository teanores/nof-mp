export function platformDatabaseUrl(context: string): string {
  if (process.env.NOF_PLATFORM_DATABASE_URL) {
    return process.env.NOF_PLATFORM_DATABASE_URL;
  }

  const host = process.env.DB_SERVER ?? "postgres";
  const port = process.env.DB_PORT ?? "5432";
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  if (!database || !user || !password) {
    throw new Error(`PostgreSQL settings are not configured for ${context}`);
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}
