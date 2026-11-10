// Sentry (browser). Off unless NEXT_PUBLIC_SENTRY_DSN is set, so local runs need no keys.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init({ dsn, tracesSampleRate: 0.1 }));
}
export {};
