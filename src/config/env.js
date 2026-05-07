const dotenv = require("dotenv");

dotenv.config();

function buildDatabaseUrlFromParts() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const db = process.env.DB_NAME || "postgres";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD;

  if (!host || !password) return null;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${db}`;
}

const env = {
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || buildDatabaseUrlFromParts(),
  JWT_SECRET: process.env.JWT_SECRET || "dev-change-this-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  MONITOR_INTERVAL_MS: Number(process.env.MONITOR_INTERVAL_MS) || 300000,
  DAILY_BACKUP_INTERVAL_MS: Number(process.env.DAILY_BACKUP_INTERVAL_MS) || 86400000,
  AUDIT_LOG_RETENTION_DAYS: Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 180,
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || "admin@sinaltech.local",
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456",
  DEFAULT_ADMIN_NAME: process.env.DEFAULT_ADMIN_NAME || "Super Admin",
  SIMULATION_TOKEN_TTL: process.env.SIMULATION_TOKEN_TTL || "30m",
  SUPABASE_URL: String(process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "audio-tracks",
  AUDIO_UPLOAD_MAX_BYTES: Number(process.env.AUDIO_UPLOAD_MAX_BYTES) || 3 * 1024 * 1024,
  AUDIO_STORAGE_SOFT_LIMIT_BYTES:
    Number(process.env.AUDIO_STORAGE_SOFT_LIMIT_BYTES) || 800000000,
  HTTP_METRICS_MAX_EVENTS: Number(process.env.HTTP_METRICS_MAX_EVENTS) || 20000,
  HTTP_METRICS_MAX_AGE_MS:
    Number(process.env.HTTP_METRICS_MAX_AGE_MS) || 24 * 60 * 60 * 1000,
  LOGIN_RATE_LIMIT_WINDOW_MS:
    Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 8,
  LOGIN_RATE_LIMIT_BLOCK_MS:
    Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS) || 20 * 60 * 1000,
  PASSWORD_MIN_LENGTH: Number(process.env.PASSWORD_MIN_LENGTH) || 10,
  DB_SSL_MODE: String(process.env.DB_SSL_MODE || "no-verify").trim().toLowerCase(),
  DB_DNS_SERVERS: String(process.env.DB_DNS_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  NODE_ENV: process.env.NODE_ENV || "development",
};

function validateEnv() {
  if (!env.DATABASE_URL) {
    console.error(
      "Missing database config. Set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD."
    );
    process.exit(1);
  }

  if (env.NODE_ENV === "production" && env.JWT_SECRET === "dev-change-this-secret") {
    console.error("Missing JWT_SECRET for production.");
    process.exit(1);
  }

  if (
    env.NODE_ENV === "production" &&
    env.DEFAULT_ADMIN_PASSWORD === "Admin@123456"
  ) {
    console.error("Missing DEFAULT_ADMIN_PASSWORD override for production.");
    process.exit(1);
  }

  if (!["auto", "disable", "require", "no-verify"].includes(env.DB_SSL_MODE)) {
    console.error("Invalid DB_SSL_MODE. Use auto, disable, require, or no-verify.");
    process.exit(1);
  }
}

validateEnv();

module.exports = env;
