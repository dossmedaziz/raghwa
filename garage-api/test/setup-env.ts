// E2E tests run against the throwaway `db-test` container (docker compose --profile test up -d db-test).
// Real environment variables win over these defaults, e.g. TEST_DB_HOST=… in CI.
const env = process.env;
Object.assign(env, {
  NODE_ENV: 'test',
  APP_TIMEZONE: 'Africa/Tunis',
  CORS_ORIGINS: 'http://localhost:5173',
  SWAGGER_ENABLED: 'false',
  DB_HOST: env.TEST_DB_HOST ?? 'localhost',
  DB_PORT: env.TEST_DB_PORT ?? '5433',
  DB_USER: env.TEST_DB_USER ?? 'raghwa',
  DB_PASSWORD: env.TEST_DB_PASSWORD ?? 'raghwa',
  DB_NAME: env.TEST_DB_NAME ?? 'raghwa_test',
  DB_LOGGING: 'false',
  JWT_OWNER_SECRET: 'test-owner-secret-0123456789-0123456789',
  JWT_CUSTOMER_SECRET: 'test-customer-secret-0123456789-012345678',
  JWT_RESET_SECRET: 'test-reset-secret-0123456789-0123456789ab',
  JWT_ACCESS_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_DAYS: '30',
  OTP_TTL_SECONDS: '300',
  OTP_MAX_ATTEMPTS: '5',
  OTP_RESEND_COOLDOWN_SECONDS: '60',
  SMS_DRIVER: 'console',
  THROTTLE_LIMIT: '100000',
});
