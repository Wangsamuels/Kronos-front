// Sentry (server/edge). Off unless NEXT_PUBLIC_SENTRY_DSN is set.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}
