const express = require("express");
const path = require("path");
const dns = require("dns");
const crypto = require("crypto");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "dev-change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const MONITOR_INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS) || 300000;
const DAILY_BACKUP_INTERVAL_MS = Number(process.env.DAILY_BACKUP_INTERVAL_MS) || 86400000;
const AUDIT_LOG_RETENTION_DAYS = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 180;
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || "admin@sinaltech.local";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456";
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || "Super Admin";
const SIMULATION_TOKEN_TTL = process.env.SIMULATION_TOKEN_TTL || "30m";
const SERVER_STARTED_AT = new Date();
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "audio-tracks";
const AUDIO_CLIP_DURATION_SECONDS = 20;
const AUDIO_UPLOAD_MAX_BYTES = Number(process.env.AUDIO_UPLOAD_MAX_BYTES) || 3 * 1024 * 1024;
const AUDIO_STORAGE_SOFT_LIMIT_BYTES =
  Number(process.env.AUDIO_STORAGE_SOFT_LIMIT_BYTES) || 800000000;

const runtimeStats = {
  lastMonitoringSweepAt: null,
  lastMonitoringSweepResult: null,
  lastDailyBackupSweepAt: null,
  lastDailyBackupSweepResult: null,
  lastAuditRetentionSweepAt: null,
  lastAuditRetentionSweepResult: null,
};
const httpMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  byEndpoint: new Map(),
  recentEvents: [],
};
const HTTP_METRICS_MAX_EVENTS = Number(process.env.HTTP_METRICS_MAX_EVENTS) || 20000;
const HTTP_METRICS_MAX_AGE_MS = Number(process.env.HTTP_METRICS_MAX_AGE_MS) || 24 * 60 * 60 * 1000;
const loginRateLimitState = new Map();
const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 8;
const LOGIN_RATE_LIMIT_BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS) || 20 * 60 * 1000;
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH) || 10;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const ROLE_SUPERADMIN = "superadmin";
const ROLE_ADMIN_ESCOLA = "admin_escola";
const ROLE_SOMENTE_LEITURA = "somente_leitura";
const ALL_ROLES = [ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA, ROLE_SOMENTE_LEITURA];
const WRITE_ROLES = [ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA];
const PERIODS = ["morning", "afternoon", "afternoonFriday"];

const PERMISSION_KEYS = {
  menus: ["dashboard", "config", "schools", "users", "audios", "audit"],
  features: [
    "dashboard_manual_section",
    "dashboard_manual_play",
    "dashboard_signal_audio",
    "dashboard_last_signal",
    "dashboard_next_signal",
    "dashboard_schedule_interface",
    "dashboard_database_status",
    "dashboard_open_alerts",
    "dashboard_schools_without_schedule",
    "dashboard_monitor_alerts",
    "dashboard_operational_history",
    "dashboard_http_metrics_view",
    "dashboard_http_metrics_filters",
    "config_schedule_write",
    "config_approve_changes",
    "config_auto_approve_changes",
    "config_templates",
    "config_backup_export",
    "config_backup_import",
    "config_backup_restore",
    "audio_manage",
    "users_create",
    "users_edit",
    "users_disable",
    "users_reset_password",
    "audit_view",
  ],
};

const ROLE_PERMISSION_DEFAULTS = {
  [ROLE_SUPERADMIN]: {
    menus: {
      dashboard: true,
      config: true,
      schools: true,
      users: true,
      audios: true,
      audit: true,
    },
    features: {
      dashboard_manual_section: true,
      dashboard_manual_play: false,
      dashboard_signal_audio: true,
      dashboard_last_signal: true,
      dashboard_next_signal: true,
      dashboard_schedule_interface: true,
      dashboard_database_status: true,
      dashboard_open_alerts: true,
      dashboard_schools_without_schedule: true,
      dashboard_monitor_alerts: true,
      dashboard_operational_history: true,
      dashboard_http_metrics_view: true,
      dashboard_http_metrics_filters: true,
      config_schedule_write: true,
      config_approve_changes: true,
      config_auto_approve_changes: true,
      config_templates: true,
      config_backup_export: true,
      config_backup_import: true,
      config_backup_restore: true,
      audio_manage: true,
      users_create: true,
      users_edit: true,
      users_disable: true,
      users_reset_password: true,
      audit_view: true,
    },
  },
  [ROLE_ADMIN_ESCOLA]: {
    menus: {
      dashboard: true,
      config: true,
      schools: false,
      users: true,
      audios: true,
      audit: true,
    },
    features: {
      dashboard_manual_section: true,
      dashboard_manual_play: true,
      dashboard_signal_audio: true,
      dashboard_last_signal: true,
      dashboard_next_signal: true,
      dashboard_schedule_interface: true,
      dashboard_database_status: true,
      dashboard_open_alerts: true,
      dashboard_schools_without_schedule: true,
      dashboard_monitor_alerts: true,
      dashboard_operational_history: false,
      dashboard_http_metrics_view: false,
      dashboard_http_metrics_filters: false,
      config_schedule_write: true,
      config_approve_changes: false,
      config_auto_approve_changes: false,
      config_templates: true,
      config_backup_export: true,
      config_backup_import: true,
      config_backup_restore: true,
      audio_manage: true,
      users_create: true,
      users_edit: true,
      users_disable: true,
      users_reset_password: false,
      audit_view: true,
    },
  },
  [ROLE_SOMENTE_LEITURA]: {
    menus: {
      dashboard: true,
      config: true,
      schools: false,
      users: false,
      audios: false,
      audit: true,
    },
    features: {
      dashboard_manual_section: true,
      dashboard_manual_play: true,
      dashboard_signal_audio: true,
      dashboard_last_signal: true,
      dashboard_next_signal: true,
      dashboard_schedule_interface: true,
      dashboard_database_status: true,
      dashboard_open_alerts: true,
      dashboard_schools_without_schedule: true,
      dashboard_monitor_alerts: true,
      dashboard_operational_history: false,
      dashboard_http_metrics_view: false,
      dashboard_http_metrics_filters: false,
      config_schedule_write: false,
      config_approve_changes: false,
      config_auto_approve_changes: false,
      config_templates: false,
      config_backup_export: true,
      config_backup_import: false,
      config_backup_restore: false,
      audio_manage: false,
      users_create: false,
      users_edit: false,
      users_disable: false,
      users_reset_password: false,
      audit_view: true,
    },
  },
};

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

const resolvedDatabaseUrl = DATABASE_URL || buildDatabaseUrlFromParts();
const dbDnsServers = String(process.env.DB_DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!resolvedDatabaseUrl) {
  console.error(
    "Missing database config. Set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD."
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-change-this-secret") {
  console.error("Missing JWT_SECRET for production.");
  process.exit(1);
}

const shouldUseSsl = !/localhost|127\.0\.0\.1/.test(resolvedDatabaseUrl);

function createLookupWithFallback() {
  const resolver = new dns.promises.Resolver();
  if (dbDnsServers.length > 0) {
    try {
      resolver.setServers(dbDnsServers);
    } catch (_err) {
      // Ignore invalid custom DNS servers and keep defaults.
    }
  }

  return (hostname, options, callback) => {
    dns.lookup(hostname, options, async (nativeErr, address, family) => {
      if (!nativeErr) {
        callback(null, address, family);
        return;
      }

      const canFallback =
        dbDnsServers.length > 0 &&
        ["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT", "ESERVFAIL"].includes(nativeErr.code);

      if (!canFallback) {
        callback(nativeErr);
        return;
      }

      const requestedFamily =
        typeof options === "number" ? options : Number(options?.family) || 0;

      try {
        if (requestedFamily === 4) {
          const ipv4 = await resolver.resolve4(hostname);
          if (ipv4?.length) return callback(null, ipv4[0], 4);
        } else if (requestedFamily === 6) {
          const ipv6 = await resolver.resolve6(hostname);
          if (ipv6?.length) return callback(null, ipv6[0], 6);
        } else {
          const ipv4 = await resolver.resolve4(hostname).catch(() => []);
          if (ipv4?.length) return callback(null, ipv4[0], 4);

          const ipv6 = await resolver.resolve6(hostname).catch(() => []);
          if (ipv6?.length) return callback(null, ipv6[0], 6);
        }

        callback(nativeErr);
      } catch (_fallbackErr) {
        callback(nativeErr);
      }
    });
  };
}

const pool = new Pool({
  connectionString: resolvedDatabaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  lookup: createLookupWithFallback(),
});

function toIsoNow() {
  return new Date().toISOString();
}

function serializeError(error) {
  if (!error) return null;
  return {
    message: error.message || null,
    code: error.code || null,
    name: error.name || null,
  };
}

function logStructured(level, event, details = {}) {
  const payload = {
    timestamp: toIsoNow(),
    level,
    event,
    ...details,
  };
  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  console.log(serialized);
}

function normalizeEndpointKey(req) {
  const method = String(req.method || "").toUpperCase() || "UNKNOWN";
  const pathValue = String(req.path || req.originalUrl || "/");
  return `${method} ${pathValue}`;
}

function pruneHttpMetricEvents(nowMs = Date.now()) {
  const cutoff = nowMs - HTTP_METRICS_MAX_AGE_MS;
  if (!httpMetrics.recentEvents.length) return;
  httpMetrics.recentEvents = httpMetrics.recentEvents.filter((event) => event.timestampMs >= cutoff);
  if (httpMetrics.recentEvents.length > HTTP_METRICS_MAX_EVENTS) {
    httpMetrics.recentEvents = httpMetrics.recentEvents.slice(-HTTP_METRICS_MAX_EVENTS);
  }
}

function recordHttpMetric(metric) {
  const endpointKey = String(metric?.endpoint || "UNKNOWN");
  const method = String(metric?.method || "UNKNOWN").toUpperCase();
  const durationMs = Number(metric?.durationMs) || 0;
  const statusCode = Number(metric?.statusCode) || 0;
  const timestampMs = Number(metric?.timestampMs) || Date.now();

  const key = String(endpointKey || "UNKNOWN");
  const previous = httpMetrics.byEndpoint.get(key) || {
    method,
    count: 0,
    errors: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    lastStatusCode: 0,
    lastSeenAt: null,
  };

  previous.count += 1;
  previous.totalLatencyMs += durationMs;
  previous.maxLatencyMs = Math.max(previous.maxLatencyMs, durationMs);
  previous.lastStatusCode = Number(statusCode) || 0;
  previous.lastSeenAt = toIsoNow();
  if (Number(statusCode) >= 500) previous.errors += 1;

  httpMetrics.byEndpoint.set(key, previous);
  httpMetrics.totalRequests += 1;
  if (Number(statusCode) >= 500) httpMetrics.totalErrors += 1;

  httpMetrics.recentEvents.push({
    endpoint: key,
    method,
    statusCode,
    durationMs,
    timestampMs,
  });
  pruneHttpMetricEvents(timestampMs);
}

function getHttpMetricsSnapshot(options = {}) {
  const topNRaw = Number.parseInt(String(options.topN || "10"), 10);
  const topN = Number.isInteger(topNRaw) ? Math.min(Math.max(topNRaw, 1), 100) : 10;
  const methodInput = String(options.method || "ALL").trim().toUpperCase();
  const allowedMethods = new Set(["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"]);
  const method = allowedMethods.has(methodInput) ? methodInput : "ALL";
  const windowRaw = Number.parseInt(String(options.windowMinutes || "60"), 10);
  const windowMinutes = Number.isInteger(windowRaw) ? Math.min(Math.max(windowRaw, 5), 1440) : 60;

  const nowMs = Date.now();
  pruneHttpMetricEvents(nowMs);
  const cutoff = nowMs - windowMinutes * 60 * 1000;

  const filtered = httpMetrics.recentEvents.filter((event) => {
    if (event.timestampMs < cutoff) return false;
    if (method !== "ALL" && event.method !== method) return false;
    return true;
  });

  const byEndpoint = new Map();
  filtered.forEach((event) => {
    const previous = byEndpoint.get(event.endpoint) || {
      endpoint: event.endpoint,
      method: event.method,
      requests: 0,
      errors: 0,
      totalLatencyMs: 0,
      latencyMaxMs: 0,
      lastStatusCode: 0,
      lastSeenAt: null,
    };
    previous.requests += 1;
    previous.totalLatencyMs += Number(event.durationMs) || 0;
    previous.latencyMaxMs = Math.max(previous.latencyMaxMs, Number(event.durationMs) || 0);
    previous.lastStatusCode = Number(event.statusCode) || 0;
    previous.lastSeenAt = new Date(event.timestampMs).toISOString();
    if (Number(event.statusCode) >= 500) previous.errors += 1;
    byEndpoint.set(event.endpoint, previous);
  });

  const rows = Array.from(byEndpoint.values()).map((item) => ({
    endpoint: item.endpoint,
    method: item.method,
    requests: item.requests,
    errors: item.errors,
    errorRate: item.requests > 0 ? Number((item.errors / item.requests).toFixed(4)) : 0,
    latencyAvgMs: item.requests > 0 ? Number((item.totalLatencyMs / item.requests).toFixed(2)) : 0,
    latencyMaxMs: Number(item.latencyMaxMs.toFixed(2)),
    lastStatusCode: item.lastStatusCode,
    lastSeenAt: item.lastSeenAt,
  }));

  rows.sort((a, b) => b.requests - a.requests);
  const totalRequests = filtered.length;
  const totalErrors = filtered.reduce(
    (sum, event) => sum + (Number(event.statusCode) >= 500 ? 1 : 0),
    0
  );

  return {
    scope: {
      method,
      windowMinutes,
      topN,
    },
    totalRequests,
    totalErrors,
    endpoints: rows.slice(0, topN),
  };
}

function isStrongPassword(password) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN_LENGTH) return false;
  return PASSWORD_POLICY_REGEX.test(value);
}

function getPasswordPolicyDescription() {
  return `minimum_length_${PASSWORD_MIN_LENGTH}_with_uppercase_lowercase_number_and_symbol`;
}

function getLoginRateLimitKey(req, email) {
  const baseIp =
    String(req.headers["x-forwarded-for"] || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] || req.socket?.remoteAddress || "unknown";
  const normalizedEmail = String(email || "").trim().toLowerCase() || "unknown";
  return `${baseIp}|${normalizedEmail}`;
}

function getLoginRateLimitRecord(key) {
  const now = Date.now();
  const existing = loginRateLimitState.get(key);
  if (!existing || now - existing.windowStartedAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    const next = {
      windowStartedAt: now,
      attempts: 0,
      blockedUntil: 0,
    };
    loginRateLimitState.set(key, next);
    return next;
  }
  return existing;
}

function isLoginBlocked(key) {
  const record = getLoginRateLimitRecord(key);
  const now = Date.now();
  if (record.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - now) / 1000)),
    };
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

function registerFailedLoginAttempt(key) {
  const record = getLoginRateLimitRecord(key);
  const now = Date.now();
  record.attempts += 1;
  if (record.attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    record.blockedUntil = now + LOGIN_RATE_LIMIT_BLOCK_MS;
  }
}

function clearLoginRateLimit(key) {
  loginRateLimitState.delete(key);
}

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", (req, res, next) => {
  const candidateRequestId = String(req.get("x-request-id") || "").trim();
  const requestId = candidateRequestId && candidateRequestId.length <= 120
    ? candidateRequestId
    : crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const endpointKey = normalizeEndpointKey(req);
    recordHttpMetric({
      endpoint: endpointKey,
      method: String(req.method || "UNKNOWN").toUpperCase(),
      statusCode: res.statusCode,
      durationMs,
      timestampMs: Date.now(),
    });

    const shouldLogRequest = Number(res.statusCode) >= 400 || durationMs >= 1000;
    if (shouldLogRequest) {
      logStructured(Number(res.statusCode) >= 500 ? "error" : "info", "http_request", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      });
    }
  });

  next();
});

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use("/api", (req, res, next) => {
  if (!WRITE_METHODS.has(String(req.method || "").toUpperCase())) return next();
  if (req.path === "/auth/login") return next();

  const token = getBearerToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.simulation === true) {
      return res.status(403).json({ error: "simulation_read_only" });
    }
  } catch (_err) {
    // Ignore invalid tokens here; auth middleware handles auth errors later.
  }
  return next();
});

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toIntId(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : text;
}

function buildEmptyPermissions() {
  return {
    menus: Object.fromEntries(PERMISSION_KEYS.menus.map((key) => [key, false])),
    features: Object.fromEntries(PERMISSION_KEYS.features.map((key) => [key, false])),
  };
}

function hasOwn(objectValue, key) {
  return Object.prototype.hasOwnProperty.call(objectValue || {}, key);
}

function normalizePermissionsPayload(rawPermissions, options = {}) {
  const includeAllKeys = options.includeAllKeys === true;
  const normalized = includeAllKeys ? buildEmptyPermissions() : { menus: {}, features: {} };
  if (!rawPermissions || typeof rawPermissions !== "object") return normalized;

  const rawMenus =
    rawPermissions.menus && typeof rawPermissions.menus === "object" ? rawPermissions.menus : {};
  const rawFeatures =
    rawPermissions.features && typeof rawPermissions.features === "object"
      ? rawPermissions.features
      : {};

  PERMISSION_KEYS.menus.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(rawMenus, key)) {
      normalized.menus[key] = Boolean(rawMenus[key]);
    }
  });

  PERMISSION_KEYS.features.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(rawFeatures, key)) {
      normalized.features[key] = Boolean(rawFeatures[key]);
    }
  });

  return normalized;
}

function getRoleDefaultPermissions(role) {
  const defaults = ROLE_PERMISSION_DEFAULTS[role] || buildEmptyPermissions();
  return {
    menus: { ...defaults.menus },
    features: { ...defaults.features },
  };
}

function getEffectivePermissions(role, customPermissions) {
  const defaults = getRoleDefaultPermissions(role);
  const normalizedCustom = normalizePermissionsPayload(customPermissions);
  const effective = buildEmptyPermissions();

  PERMISSION_KEYS.menus.forEach((key) => {
    if (hasOwn(normalizedCustom.menus, key)) {
      effective.menus[key] = Boolean(normalizedCustom.menus[key]);
      return;
    }
    effective.menus[key] = Boolean(defaults.menus[key]);
  });

  PERMISSION_KEYS.features.forEach((key) => {
    if (hasOwn(normalizedCustom.features, key)) {
      effective.features[key] = Boolean(normalizedCustom.features[key]);
      return;
    }
    effective.features[key] = Boolean(defaults.features[key]);
  });

  return effective;
}

function hasEffectivePermission(user, permissionPath) {
  const [section, key] = String(permissionPath || "").split(".");
  if (!section || !key) return false;

  const effective = getEffectivePermissions(user?.role, user?.permissions);
  if (section === "menus") return Boolean(effective.menus[key]);
  if (section === "features") return Boolean(effective.features[key]);
  return false;
}

function parseDateFilter(value, options = {}) {
  const text = String(value || "").trim();
  if (!text) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  let parsed;
  if (isDateOnly) {
    parsed = new Date(`${text}T00:00:00.000Z`);
    if (options.endOfDay) {
      parsed = new Date(`${text}T23:59:59.999Z`);
    }
  } else {
    parsed = new Date(text);
  }

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function sanitizeUser(row) {
  const permissions = normalizePermissionsPayload(row.permissions);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    schoolId: row.school_id || null,
    schoolName: row.school_name || null,
    permissions,
    effectivePermissions: getEffectivePermissions(row.role, permissions),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchool(row) {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    active: row.active,
    publicToken: row.public_token || null,
    createdAt: row.created_at,
  };
}

function generateSchoolPublicToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function groupScheduleRows(rows) {
  const grouped = {
    morning: [],
    afternoon: [],
    afternoonFriday: [],
  };

  rows.forEach((row) => {
    if (!PERIODS.includes(row.period)) return;
    grouped[row.period].push({
      time: normalizeTime(row.time),
      name: row.name,
      music: row.music,
      duration: Number(row.duration) || 15,
    });
  });

  PERIODS.forEach((period) => {
    grouped[period].sort((a, b) => a.time.localeCompare(b.time));
  });

  return grouped;
}

function normalizeSchedulePayload(payload) {
  const result = {
    morning: [],
    afternoon: [],
    afternoonFriday: [],
  };

  const source = payload?.schedule && typeof payload.schedule === "object" ? payload.schedule : payload;

  if (!source || typeof source !== "object") {
    throw new Error("Schedule payload must be an object.");
  }

  PERIODS.forEach((period) => {
    const items = Array.isArray(source[period]) ? source[period] : [];
    result[period] = items.map((item, index) => {
      const time = normalizeTime(item?.time);
      const name = String(item?.name || "").trim();
      const music = String(item?.music || "").trim();
      const duration = Number.parseInt(item?.duration, 10);

      if (!/^\d{2}:\d{2}$/.test(time)) {
        throw new Error(`Invalid time at ${period}[${index}].`);
      }
      if (!name) {
        throw new Error(`Missing name at ${period}[${index}].`);
      }
      if (!music) {
        throw new Error(`Missing music at ${period}[${index}].`);
      }

      return {
        time,
        name,
        music,
        duration: Number.isFinite(duration) && duration > 0 ? duration : 15,
      };
    });
  });

  return mergeDuplicateScheduleTimes(result);
}

function mergeDuplicateScheduleTimes(scheduleObject) {
  const merged = {
    morning: [],
    afternoon: [],
    afternoonFriday: [],
  };

  PERIODS.forEach((period) => {
    const byTime = new Map();
    const items = Array.isArray(scheduleObject?.[period]) ? scheduleObject[period] : [];

    items.forEach((item) => {
      const existing = byTime.get(item.time);
      if (!existing) {
        const next = { ...item };
        byTime.set(item.time, next);
        merged[period].push(next);
        return;
      }

      const nextName = String(item.name || "").trim();
      const currentNames = String(existing.name || "")
        .split(" / ")
        .map((part) => part.trim())
        .filter(Boolean);
      if (nextName && !currentNames.includes(nextName)) {
        existing.name = [...currentNames, nextName].join(" / ");
      }

      if (!existing.music && item.music) {
        existing.music = item.music;
      }
      existing.duration = Math.max(Number(existing.duration) || 15, Number(item.duration) || 15);
    });
  });

  return merged;
}

function sendInternalError(res, errorCode, err) {
  const payload = { error: errorCode };
  if (res?.req?.requestId) {
    payload.requestId = res.req.requestId;
  }
  if (process.env.NODE_ENV !== "production") {
    payload.detail = {
      code: err?.code || null,
      message: err?.message || null,
    };
  }
  logStructured("error", "internal_error_response", {
    requestId: res?.req?.requestId || null,
    errorCode,
    error: serializeError(err),
  });
  res.status(500).json(payload);
}

function getRequestMeta(req) {
  return {
    ip:
      String(req.headers["x-forwarded-for"] || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)[0] || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
    requestId: req.requestId || null,
  };
}

async function writeAuditLog(entry, client = pool) {
  try {
    await client.query(
      `
      INSERT INTO audit_logs (
        user_id, school_id, action, resource, resource_id,
        before_data, after_data, meta, ip, user_agent
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        entry.userId || null,
        entry.schoolId || null,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        entry.beforeData ? JSON.stringify(entry.beforeData) : null,
        entry.afterData ? JSON.stringify(entry.afterData) : null,
        entry.meta ? JSON.stringify(entry.meta) : null,
        entry.ip || null,
        entry.userAgent || null,
      ]
    );
  } catch (error) {
    logStructured("error", "audit_log_insert_failed", {
      error: serializeError(error),
      action: entry?.action || null,
      resource: entry?.resource || null,
    });
  }
}

async function getSchoolById(client, schoolId) {
  const result = await client.query(
    `
    SELECT id, name, slug, timezone, active, public_token, created_at
    FROM schools
    WHERE id = $1
    LIMIT 1
    `,
    [schoolId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function getScheduleObjectBySchoolId(client, schoolId) {
  const rows = await client.query(
    `
    SELECT period, time::text AS time, name, music, duration
    FROM schedules
    WHERE school_id = $1
    ORDER BY period ASC, time ASC
    `,
    [schoolId]
  );
  return groupScheduleRows(rows.rows);
}

async function replaceSchoolSchedule(client, schoolId, scheduleObject) {
  await client.query("DELETE FROM schedules WHERE school_id = $1", [schoolId]);

  for (const period of PERIODS) {
    for (const item of scheduleObject[period]) {
      await client.query(
        `
        INSERT INTO schedules (school_id, period, time, name, music, duration)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [schoolId, period, item.time, item.name, item.music, item.duration]
      );
    }
  }
}

function summarizeSchedule(scheduleObject) {
  const safe = scheduleObject && typeof scheduleObject === "object" ? scheduleObject : {};
  return {
    morning: Array.isArray(safe.morning) ? safe.morning.length : 0,
    afternoon: Array.isArray(safe.afternoon) ? safe.afternoon.length : 0,
    afternoonFriday: Array.isArray(safe.afternoonFriday) ? safe.afternoonFriday.length : 0,
  };
}

function mapScheduleChangeRequest(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const beforePayload =
    row.before_payload && typeof row.before_payload === "object" ? row.before_payload : {};
  return {
    id: row.id,
    schoolId: row.school_id,
    schoolName: row.school_name || null,
    proposedBy: row.proposed_by || null,
    proposedByName: row.proposed_by_name || null,
    beforePayload,
    beforeSummary: summarizeSchedule(beforePayload),
    payload,
    payloadSummary: summarizeSchedule(payload),
    status: row.status,
    reviewNote: row.review_note || null,
    reviewedBy: row.reviewed_by || null,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAudioTrack(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    active: row.active !== false,
    createdBy: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertSupabaseStorageConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
    const error = new Error("supabase_storage_not_configured");
    error.code = "SUPABASE_STORAGE_NOT_CONFIGURED";
    throw error;
  }
}

function getSupabasePublicStorageUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${String(storagePath || "").split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadAudioClipToSupabase(storagePath, buffer, contentType) {
  assertSupabaseStorageConfigured();
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${String(storagePath).split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "Cache-Control": "3600",
      "x-upsert": "false",
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`supabase_upload_failed:${response.status}`);
    error.detail = detail;
    throw error;
  }
}

async function deleteAudioClipFromSupabase(storagePath) {
  assertSupabaseStorageConfigured();
  const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}`;
  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [storagePath] }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`supabase_delete_failed:${response.status}`);
    error.detail = detail;
    throw error;
  }
}

function canAutoApproveScheduleChanges(user) {
  if (!user) return false;
  if (user.role === ROLE_SUPERADMIN) return true;
  return hasEffectivePermission(user, "features.config_auto_approve_changes");
}

async function createAutoApprovedScheduleChangeRequest(
  client,
  schoolId,
  proposedBy,
  reviewedBy,
  schedulePayload,
  reviewNote = "Autoaprovado por permissao"
) {
  const beforeSchedule = await getScheduleObjectBySchoolId(client, schoolId);
  const result = await client.query(
    `
    INSERT INTO schedule_change_requests (
      school_id,
      proposed_by,
      payload,
      before_payload,
      status,
      review_note,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,'approved',$5,$6,NOW(),NOW(),NOW())
    RETURNING id, school_id, proposed_by, payload, before_payload, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
    `,
    [
      schoolId,
      proposedBy || null,
      JSON.stringify(schedulePayload),
      JSON.stringify(beforeSchedule),
      reviewNote,
      reviewedBy || null,
    ]
  );
  return {
    row: result.rows[0],
    beforeSchedule,
  };
}

async function upsertPendingScheduleChangeRequest(client, schoolId, proposedBy, schedulePayload) {
  const beforeSchedule = await getScheduleObjectBySchoolId(client, schoolId);
  const pendingResult = await client.query(
    `
    SELECT id
    FROM schedule_change_requests
    WHERE school_id = $1
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [schoolId]
  );

  if (pendingResult.rowCount) {
    const updatePending = await client.query(
      `
      UPDATE schedule_change_requests
      SET payload = $1,
          before_payload = $2,
          proposed_by = $3,
          review_note = NULL,
          reviewed_by = NULL,
          reviewed_at = NULL,
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, school_id, proposed_by, payload, before_payload, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
      `,
      [
        JSON.stringify(schedulePayload),
        JSON.stringify(beforeSchedule),
        proposedBy || null,
        pendingResult.rows[0].id,
      ]
    );
    return updatePending.rows[0];
  }

  const insertPending = await client.query(
    `
    INSERT INTO schedule_change_requests (school_id, proposed_by, payload, before_payload, status)
    VALUES ($1,$2,$3,$4,'pending')
    RETURNING id, school_id, proposed_by, payload, before_payload, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
    `,
    [
      schoolId,
      proposedBy || null,
      JSON.stringify(schedulePayload),
      JSON.stringify(beforeSchedule),
    ]
  );
  return insertPending.rows[0];
}

async function saveSchoolBackupSnapshot(client, options) {
  const trigger = String(options?.trigger || "manual").trim() || "manual";
  const schoolId = toIntId(options?.schoolId);
  if (!schoolId) throw new Error("invalid_school_id_for_backup");

  if (trigger === "daily" && options?.skipIfAlreadyToday) {
    const existing = await client.query(
      `
      SELECT id
      FROM school_backups
      WHERE school_id = $1
        AND trigger = 'daily'
        AND created_at::date = CURRENT_DATE
      LIMIT 1
      `,
      [schoolId]
    );
    if (existing.rowCount) return null;
  }

  const schedule = options?.schedule || (await getScheduleObjectBySchoolId(client, schoolId));
  const metadata =
    options?.metadata && typeof options.metadata === "object" ? options.metadata : null;

  const result = await client.query(
    `
    INSERT INTO school_backups (school_id, schedule, metadata, created_by, trigger)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, school_id, schedule, metadata, created_by, trigger, created_at
    `,
    [
      schoolId,
      JSON.stringify(schedule),
      metadata ? JSON.stringify(metadata) : null,
      options?.createdBy || null,
      trigger,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    schoolId: row.school_id,
    schedule: row.schedule,
    metadata: row.metadata,
    createdBy: row.created_by,
    trigger: row.trigger,
    createdAt: row.created_at,
    summary: summarizeSchedule(row.schedule),
  };
}

async function recordOperationalMetricSample(client, sample) {
  const metricDate = String(sample?.metricDate || new Date().toISOString().slice(0, 10));
  const schoolId = toIntId(sample?.schoolId) || null;
  const dbLatencyMs = Number.isFinite(sample?.dbLatencyMs)
    ? Math.max(0, Number(sample.dbLatencyMs))
    : null;
  const openAlerts = Number.isFinite(sample?.openAlerts) ? Math.max(0, Number(sample.openAlerts)) : 0;
  const playbackFailures = Number.isFinite(sample?.playbackFailures)
    ? Math.max(0, Number(sample.playbackFailures))
    : 0;
  const pendingApprovals = Number.isFinite(sample?.pendingApprovals)
    ? Math.max(0, Number(sample.pendingApprovals))
    : 0;
  const schoolsWithoutSchedule = Number.isFinite(sample?.schoolsWithoutSchedule)
    ? Math.max(0, Number(sample.schoolsWithoutSchedule))
    : 0;

  await client.query(
    `
    INSERT INTO operational_daily_metrics (
      metric_date,
      school_id,
      db_latency_avg_ms,
      db_latency_max_ms,
      open_alerts,
      playback_failures,
      pending_approvals,
      schools_without_schedule,
      samples,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $3,
      $4,
      $5,
      $6,
      $7,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (metric_date, school_id)
    DO UPDATE SET
      db_latency_avg_ms = CASE
        WHEN EXCLUDED.db_latency_avg_ms IS NULL THEN operational_daily_metrics.db_latency_avg_ms
        WHEN operational_daily_metrics.db_latency_avg_ms IS NULL THEN EXCLUDED.db_latency_avg_ms
        ELSE (
          (operational_daily_metrics.db_latency_avg_ms * operational_daily_metrics.samples) +
          EXCLUDED.db_latency_avg_ms
        ) / (operational_daily_metrics.samples + 1)
      END,
      db_latency_max_ms = CASE
        WHEN EXCLUDED.db_latency_max_ms IS NULL THEN operational_daily_metrics.db_latency_max_ms
        WHEN operational_daily_metrics.db_latency_max_ms IS NULL THEN EXCLUDED.db_latency_max_ms
        ELSE GREATEST(operational_daily_metrics.db_latency_max_ms, EXCLUDED.db_latency_max_ms)
      END,
      open_alerts = EXCLUDED.open_alerts,
      playback_failures = EXCLUDED.playback_failures,
      pending_approvals = EXCLUDED.pending_approvals,
      schools_without_schedule = EXCLUDED.schools_without_schedule,
      samples = operational_daily_metrics.samples + 1,
      updated_at = NOW()
    `,
    [
      metricDate,
      schoolId,
      dbLatencyMs,
      openAlerts,
      playbackFailures,
      pendingApprovals,
      schoolsWithoutSchedule,
    ]
  );
}

async function runDailyBackupSweep(trigger = "daily", actorUserId = null) {
  const client = await pool.connect();
  try {
    const schools = await client.query(
      `
      SELECT id
      FROM schools
      WHERE active = TRUE
      ORDER BY id ASC
      `
    );

    let created = 0;
    for (const school of schools.rows) {
      const snapshot = await saveSchoolBackupSnapshot(client, {
        schoolId: school.id,
        trigger,
        createdBy: actorUserId,
        metadata: { source: "scheduler" },
        skipIfAlreadyToday: trigger === "daily",
      });
      if (snapshot) created += 1;
    }

    const result = {
      checkedSchools: schools.rowCount,
      createdBackups: created,
      trigger,
      createdAt: new Date().toISOString(),
    };
    runtimeStats.lastDailyBackupSweepAt = result.createdAt;
    runtimeStats.lastDailyBackupSweepResult = {
      trigger: result.trigger,
      checkedSchools: result.checkedSchools,
      createdBackups: result.createdBackups,
    };
    return result;
  } finally {
    client.release();
  }
}

async function runAuditRetentionSweep(trigger = "daily", actorUserId = null) {
  const retentionDays = Math.max(7, AUDIT_LOG_RETENTION_DAYS);
  try {
    const result = await pool.query(
      `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - ($1::int) * INTERVAL '1 day'
      `,
      [retentionDays]
    );

    const sweepResult = {
      trigger,
      retentionDays,
      deletedRows: Number(result.rowCount) || 0,
      actorUserId: actorUserId || null,
      executedAt: toIsoNow(),
    };
    runtimeStats.lastAuditRetentionSweepAt = sweepResult.executedAt;
    runtimeStats.lastAuditRetentionSweepResult = sweepResult;
    return sweepResult;
  } catch (error) {
    logStructured("error", "audit_retention_sweep_failed", {
      trigger,
      retentionDays,
      actorUserId: actorUserId || null,
      error: serializeError(error),
    });
    throw error;
  }
}

function canAccessSchool(user, schoolId) {
  if (user.role === ROLE_SUPERADMIN) return true;
  if (!user.schoolId) return false;
  return Number(user.schoolId) === Number(schoolId);
}

function isSchoolBoundRole(role) {
  return role === ROLE_ADMIN_ESCOLA || role === ROLE_SOMENTE_LEITURA;
}

function signAccessToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function buildSimulationContext(actorUser, options = {}) {
  return {
    active: true,
    type: options.type || "user",
    actorUserId: actorUser?.id || null,
    actorName: actorUser?.name || actorUser?.email || null,
    actorEmail: actorUser?.email || null,
    targetUserId: options.targetUserId || null,
    targetRole: options.targetRole || null,
    targetSchoolId: options.targetSchoolId || null,
    issuedAt: new Date().toISOString(),
  };
}

function getBearerToken(req) {
  const value = req.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

async function authenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "auth_required" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    return res.status(401).json({ error: "invalid_token" });
  }

  const requesterUserId = toIntId(decoded?.sub);
  if (!requesterUserId) return res.status(401).json({ error: "invalid_token" });

  try {
    const baseUserResult = await pool.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
             s.name AS school_name, s.active AS school_active
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.id = $1 AND u.active = TRUE
      LIMIT 1
      `,
      [requesterUserId]
    );

    if (!baseUserResult.rowCount) {
      return res.status(401).json({ error: "user_not_found_or_inactive" });
    }

    const baseUserRow = baseUserResult.rows[0];
    if (isSchoolBoundRole(baseUserRow.role)) {
      if (!baseUserRow.school_id) {
        return res.status(403).json({ error: "user_school_not_configured" });
      }
      if (baseUserRow.school_active !== true) {
        return res.status(403).json({ error: "school_inactive_or_not_found" });
      }
    }

    const baseUser = sanitizeUser(baseUserRow);
    req.actorUser = baseUser;

    if (decoded?.simulation === true) {
      if (baseUser.role !== ROLE_SUPERADMIN) {
        return res.status(403).json({ error: "simulation_requires_superadmin" });
      }

      const simulatedUserId = toIntId(decoded?.simulatedUserId);
      if (simulatedUserId) {
        const simulatedResult = await pool.query(
          `
          SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
                 s.name AS school_name, s.active AS school_active
          FROM users u
          LEFT JOIN schools s ON s.id = u.school_id
          WHERE u.id = $1 AND u.active = TRUE
          LIMIT 1
          `,
          [simulatedUserId]
        );
        if (!simulatedResult.rowCount) {
          return res.status(404).json({ error: "simulation_user_not_found" });
        }

        const simulatedRow = simulatedResult.rows[0];
        if (isSchoolBoundRole(simulatedRow.role)) {
          if (!simulatedRow.school_id) {
            return res.status(403).json({ error: "user_school_not_configured" });
          }
          if (simulatedRow.school_active !== true) {
            return res.status(403).json({ error: "school_inactive_or_not_found" });
          }
        }

        const simulationContext = buildSimulationContext(baseUser, {
          type: "user",
          targetUserId: simulatedUserId,
          targetRole: simulatedRow.role,
          targetSchoolId: simulatedRow.school_id || null,
        });
        req.user = { ...sanitizeUser(simulatedRow), simulation: simulationContext };
        req.simulation = simulationContext;
        return next();
      }
      return res.status(400).json({ error: "invalid_simulation_payload" });
    }

    req.user = baseUser;
    req.simulation = null;
    return next();
  } catch (error) {
    console.error("Authentication query error:", error);
    return sendInternalError(res, "auth_query_failed", error);
  }
}

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "insufficient_role" });
    }
    next();
  };
}

function requireWriteAccess(req, res, next) {
  if (!req.user || !WRITE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "read_only_profile" });
  }
  next();
}

function requireNotInSimulation(req, res, next) {
  if (req.simulation?.active) {
    return res.status(403).json({ error: "simulation_read_only" });
  }
  next();
}

function requirePermission(permissionPath) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    if (!hasEffectivePermission(req.user, permissionPath)) {
      return res.status(403).json({ error: "permission_denied", permission: permissionPath });
    }
    next();
  };
}

function requireAnyPermission(permissionPaths) {
  const allowedPaths = Array.isArray(permissionPaths) ? permissionPaths.filter(Boolean) : [];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    const hasAny = allowedPaths.some((permissionPath) =>
      hasEffectivePermission(req.user, permissionPath)
    );
    if (!hasAny) {
      return res.status(403).json({
        error: "permission_denied",
        permissionAnyOf: allowedPaths,
      });
    }
    next();
  };
}

function requireSchoolScope(options = {}) {
  const { paramName, bodyField, queryField } = options;

  return (req, res, next) => {
    let schoolId = null;

    if (paramName && req.params?.[paramName] !== undefined) {
      schoolId = toIntId(req.params[paramName]);
    } else if (bodyField && req.body?.[bodyField] !== undefined) {
      schoolId = toIntId(req.body[bodyField]);
    } else if (queryField && req.query?.[queryField] !== undefined) {
      schoolId = toIntId(req.query[queryField]);
    }

    if (!schoolId) {
      return res.status(400).json({ error: "invalid_school_id" });
    }

    req.targetSchoolId = schoolId;
    if (canAccessSchool(req.user, schoolId)) return next();
    return res.status(403).json({ error: "school_access_denied" });
  };
}

async function upsertAlert(client, payload) {
  const result = await client.query(
    `
    INSERT INTO alerts (
      type, severity, school_id, message, details, status, fingerprint
    )
    VALUES ($1,$2,$3,$4,$5,'open',$6)
    ON CONFLICT (fingerprint)
    DO UPDATE SET
      type = EXCLUDED.type,
      severity = EXCLUDED.severity,
      school_id = EXCLUDED.school_id,
      message = EXCLUDED.message,
      details = EXCLUDED.details,
      status = 'open',
      resolved_at = NULL,
      resolved_by = NULL,
      updated_at = NOW()
    RETURNING id, type, severity, school_id, message, details, status, fingerprint, created_at, updated_at
    `,
    [
      payload.type,
      payload.severity,
      payload.schoolId || null,
      payload.message,
      payload.details ? JSON.stringify(payload.details) : null,
      payload.fingerprint,
    ]
  );
  return result.rows[0];
}

async function resolveAlertByFingerprint(client, fingerprint, resolvedBy = null) {
  await client.query(
    `
    UPDATE alerts
    SET status = 'resolved',
        resolved_at = NOW(),
        resolved_by = $2,
        updated_at = NOW()
    WHERE fingerprint = $1
      AND status = 'open'
    `,
    [fingerprint, resolvedBy]
  );
}

async function runMonitoringSweep(trigger = "interval", actorUserId = null) {
  const client = await pool.connect();
  try {
    const schoolsResult = await client.query(
      `
      SELECT s.id, s.name, COUNT(sc.id)::int AS schedule_count
      FROM schools s
      LEFT JOIN schedules sc ON sc.school_id = s.id
      WHERE s.active = TRUE
      GROUP BY s.id, s.name
      ORDER BY s.id
      `
    );

    let schoolsWithoutSchedule = 0;

    for (const school of schoolsResult.rows) {
      const fingerprint = `school_without_schedule:${school.id}`;
      if (school.schedule_count === 0) {
        schoolsWithoutSchedule += 1;
        await upsertAlert(client, {
          type: "school_without_schedule",
          severity: "warning",
          schoolId: school.id,
          message: `Escola "${school.name}" sem horarios cadastrados.`,
          fingerprint,
          details: {
            monitorTrigger: trigger,
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        await resolveAlertByFingerprint(client, fingerprint, actorUserId);
      }
    }

    const result = {
      checkedSchools: schoolsResult.rowCount,
      schoolsWithoutSchedule,
      checkedAt: new Date().toISOString(),
    };
    runtimeStats.lastMonitoringSweepAt = result.checkedAt;
    runtimeStats.lastMonitoringSweepResult = {
      trigger,
      checkedSchools: result.checkedSchools,
      schoolsWithoutSchedule: result.schoolsWithoutSchedule,
    };
    return result;
  } finally {
    client.release();
  }
}

async function ensureEnterpriseSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        timezone VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        public_token VARCHAR(80) UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE schools
      ADD COLUMN IF NOT EXISTS public_token VARCHAR(80)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        period VARCHAR(30) NOT NULL CHECK (period IN ('morning', 'afternoon', 'afternoonFriday')),
        time TIME NOT NULL,
        name VARCHAR(255) NOT NULL,
        music VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL DEFAULT 15,
        UNIQUE (school_id, period, time)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(30) NOT NULL CHECK (role IN ('superadmin','admin_escola','somente_leitura')),
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        before_data JSONB,
        after_data JSONB,
        meta JSONB,
        ip VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        source_school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        payload JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audio_tracks (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        storage_path TEXT NOT NULL UNIQUE,
        public_url TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'audio/wav',
        size_bytes INTEGER NOT NULL DEFAULT 0,
        duration_seconds INTEGER NOT NULL DEFAULT 20,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id BIGSERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')),
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        details JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
        fingerprint VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS school_backups (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        schedule JSONB NOT NULL,
        metadata JSONB,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        trigger VARCHAR(40) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_change_requests (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        proposed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        payload JSONB NOT NULL,
        before_payload JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
        review_note TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE schedule_change_requests
      ADD COLUMN IF NOT EXISTS before_payload JSONB
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS operational_daily_metrics (
        id BIGSERIAL PRIMARY KEY,
        metric_date DATE NOT NULL,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        db_latency_avg_ms NUMERIC(10,2),
        db_latency_max_ms NUMERIC(10,2),
        open_alerts INTEGER NOT NULL DEFAULT 0,
        playback_failures INTEGER NOT NULL DEFAULT 0,
        pending_approvals INTEGER NOT NULL DEFAULT 0,
        schools_without_schedule INTEGER NOT NULL DEFAULT 0,
        samples INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (metric_date, school_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_school_id ON schedules(school_id)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_public_token ON schools(public_token)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_status_school ON alerts(status, school_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_backups_school_created_at ON school_backups(school_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audio_tracks_active_name ON audio_tracks(active, name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_change_requests_school_status ON schedule_change_requests(school_id, status, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_operational_daily_metrics_school_date ON operational_daily_metrics(school_id, metric_date DESC)
    `);

    const schoolsWithoutPublicToken = await client.query(`
      SELECT id
      FROM schools
      WHERE public_token IS NULL OR public_token = ''
      ORDER BY id ASC
    `);

    for (const school of schoolsWithoutPublicToken.rows) {
      let updated = false;
      for (let attempt = 0; attempt < 5 && !updated; attempt += 1) {
        try {
          await client.query("UPDATE schools SET public_token = $1 WHERE id = $2", [
            generateSchoolPublicToken(),
            school.id,
          ]);
          updated = true;
        } catch (error) {
          if (error?.code !== "23505" || attempt === 4) throw error;
        }
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function seedDefaultSuperAdmin() {
  const existing = await pool.query("SELECT COUNT(*)::int AS total FROM users");
  const total = existing.rows[0]?.total || 0;
  if (total > 0) return;

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  await pool.query(
    `
    INSERT INTO users (name, email, password_hash, role, school_id, active)
    VALUES ($1, $2, $3, $4, NULL, TRUE)
    `,
    [DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL.toLowerCase(), passwordHash, ROLE_SUPERADMIN]
  );

  console.log("Default superadmin created.");
  console.log(`Email: ${DEFAULT_ADMIN_EMAIL}`);
  console.log(`Password: ${DEFAULT_ADMIN_PASSWORD}`);
  console.log("Change credentials after first login.");
}

app.get("/api/health", async (_req, res) => {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - start;
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: {
        status: "up",
        latencyMs,
      },
    });
  } catch (error) {
    console.error("Health check error:", {
      code: error?.code,
      message: error?.message,
    });

    const payload = {
      ok: false,
      error: "database_unavailable",
      timestamp: new Date().toISOString(),
      database: {
        status: "down",
      },
    };
    if (process.env.NODE_ENV !== "production") {
      payload.detail = {
        code: error?.code || null,
        message: error?.message || null,
      };
    }

    res.status(500).json(payload);
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const rateLimitKey = getLoginRateLimitKey(req, email);
  const rateLimitState = isLoginBlocked(rateLimitKey);
  const requestMeta = getRequestMeta(req);

  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }
  if (rateLimitState.blocked) {
    res.setHeader("retry-after", String(rateLimitState.retryAfterSeconds));
    return res.status(429).json({
      error: "too_many_login_attempts",
      retryAfterSeconds: rateLimitState.retryAfterSeconds,
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
             s.name AS school_name, s.active AS school_active
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.email = $1 AND u.active = TRUE
      LIMIT 1
      `,
      [email]
    );

    if (!result.rowCount) {
      registerFailedLoginAttempt(rateLimitKey);
      await writeAuditLog({
        userId: null,
        schoolId: null,
        action: "login_failed",
        resource: "auth",
        resourceId: null,
        afterData: { email, reason: "user_not_found_or_inactive" },
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        meta: { requestId: requestMeta.requestId },
      });
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = result.rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      registerFailedLoginAttempt(rateLimitKey);
      await writeAuditLog({
        userId: user.id || null,
        schoolId: user.school_id || null,
        action: "login_failed",
        resource: "auth",
        resourceId: String(user.id || ""),
        afterData: { email, reason: "invalid_password" },
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        meta: { requestId: requestMeta.requestId },
      });
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (isSchoolBoundRole(user.role)) {
      if (!user.school_id) {
        return res.status(403).json({ error: "user_school_not_configured" });
      }
      if (user.school_active !== true) {
        return res.status(403).json({ error: "school_inactive_or_not_found" });
      }
    }

    const token = signAccessToken(
      {
        sub: user.id,
        role: user.role,
        schoolId: user.school_id || null,
      }
    );

    clearLoginRateLimit(rateLimitKey);
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: user.id,
      schoolId: user.school_id || null,
      action: "login",
      resource: "auth",
      resourceId: String(user.id),
      afterData: { email: user.email, role: user.role },
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { requestId: meta.requestId },
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    logStructured("error", "auth_login_failed", {
      requestId: req.requestId || null,
      email,
      error: serializeError(error),
    });
    sendInternalError(res, "failed_to_login", error);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post(
  "/api/auth/simulate/user/:id",
  authenticate,
  requireRoles([ROLE_SUPERADMIN]),
  requireNotInSimulation,
  async (req, res) => {
    const targetUserId = toIntId(req.params.id);
    if (!targetUserId) return res.status(400).json({ error: "invalid_user_id" });

    try {
      const targetResult = await pool.query(
        `
        SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
               s.name AS school_name, s.active AS school_active
        FROM users u
        LEFT JOIN schools s ON s.id = u.school_id
        WHERE u.id = $1 AND u.active = TRUE
        LIMIT 1
        `,
        [targetUserId]
      );

      if (!targetResult.rowCount) {
        return res.status(404).json({ error: "simulation_user_not_found" });
      }

      const targetRow = targetResult.rows[0];
      if (isSchoolBoundRole(targetRow.role)) {
        if (!targetRow.school_id) {
          return res.status(403).json({ error: "user_school_not_configured" });
        }
        if (targetRow.school_active !== true) {
          return res.status(403).json({ error: "school_inactive_or_not_found" });
        }
      }

      const simulationToken = signAccessToken(
        {
          sub: req.user.id,
          simulation: true,
          simulatedUserId: targetRow.id,
        },
        SIMULATION_TOKEN_TTL
      );

      const simulationContext = buildSimulationContext(req.user, {
        type: "user",
        targetUserId: targetRow.id,
        targetRole: targetRow.role,
        targetSchoolId: targetRow.school_id || null,
      });
      const simulatedUser = { ...sanitizeUser(targetRow), simulation: simulationContext };

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: simulatedUser.schoolId || null,
        action: "start_user_simulation",
        resource: "auth_simulation",
        resourceId: String(simulatedUser.id),
        afterData: {
          simulationType: "user",
          targetUserId: simulatedUser.id,
          targetRole: simulatedUser.role,
          targetSchoolId: simulatedUser.schoolId || null,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      return res.json({
        token: simulationToken,
        user: simulatedUser,
      });
    } catch (error) {
      console.error("POST /api/auth/simulate/user/:id error:", error);
      return sendInternalError(res, "failed_to_start_user_simulation", error);
    }
  }
);

app.post("/api/auth/change-password", authenticate, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "current_and_new_password_required" });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      error: "weak_password",
      policy: getPasswordPolicyDescription(),
    });
  }

  try {
    const userResult = await pool.query(
      `
      SELECT id, email, password_hash, school_id
      FROM users
      WHERE id = $1 AND active = TRUE
      LIMIT 1
      `,
      [req.user.id]
    );
    if (!userResult.rowCount) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const userRow = userResult.rows[0];
    const matches = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!matches) {
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.user.schoolId || null,
        action: "change_password_failed",
        resource: "auth",
        resourceId: String(req.user.id),
        afterData: { reason: "invalid_current_password" },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });
      return res.status(401).json({ error: "invalid_current_password" });
    }

    const samePassword = await bcrypt.compare(newPassword, userRow.password_hash);
    if (samePassword) {
      return res.status(400).json({ error: "new_password_must_be_different" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [passwordHash, req.user.id]
    );

    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: req.user.schoolId || null,
      action: "change_password_self",
      resource: "auth",
      resourceId: String(req.user.id),
      afterData: { changedAt: new Date().toISOString() },
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { requestId: meta.requestId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    sendInternalError(res, "failed_to_change_password", error);
  }
});

app.get(
  "/api/auth/users",
  authenticate,
  requirePermission("menus.users"),
  requireRoles([ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA]),
  async (req, res) => {
    try {
      const values = [];
      const where = [];

      if (req.user.role !== ROLE_SUPERADMIN) {
        values.push(req.user.schoolId);
        where.push(`u.school_id = $${values.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const result = await pool.query(
        `
        SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
               s.name AS school_name
        FROM users u
        LEFT JOIN schools s ON s.id = u.school_id
        ${whereSql}
        ORDER BY u.created_at DESC
        `,
        values
      );

      res.json(result.rows.map((row) => sanitizeUser(row)));
    } catch (error) {
      console.error("GET /api/auth/users error:", error);
      sendInternalError(res, "failed_to_list_users", error);
    }
  }
);

app.post(
  "/api/auth/users",
  authenticate,
  requirePermission("menus.users"),
  requirePermission("features.users_create"),
  requireRoles([ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA]),
  async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "").trim();
    const requestedSchoolId =
      req.body?.schoolId !== undefined ? toIntId(req.body.schoolId) : null;
    const requestedPermissions = normalizePermissionsPayload(req.body?.permissions);
    const active = req.body?.active === false ? false : true;

    if (!name || !email || !password || !ALL_ROLES.includes(role)) {
      return res.status(400).json({ error: "invalid_user_payload" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: "weak_password",
        policy: getPasswordPolicyDescription(),
      });
    }

    const isSuperAdmin = req.user.role === ROLE_SUPERADMIN;
    let targetSchoolId = requestedSchoolId;

    if (!isSuperAdmin) {
      if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
      if (role === ROLE_SUPERADMIN) {
        return res.status(403).json({ error: "cannot_assign_superadmin_role" });
      }
      if (requestedSchoolId && Number(requestedSchoolId) !== Number(req.user.schoolId)) {
        return res.status(403).json({ error: "school_access_denied" });
      }
      targetSchoolId = req.user.schoolId;
    } else if (role === ROLE_SUPERADMIN) {
      targetSchoolId = null;
    }

    if (isSchoolBoundRole(role)) {
      if (!targetSchoolId) {
        return res.status(400).json({ error: "school_id_required_for_non_superadmin" });
      }
      const school = await getSchoolById(pool, targetSchoolId);
      if (!school) {
        return res.status(404).json({ error: "school_not_found" });
      }
      if (school.active === false) {
        return res.status(400).json({ error: "school_inactive" });
      }
    } else {
      targetSchoolId = null;
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const permissionsToSave = requestedPermissions;

      const result = await pool.query(
        `
        INSERT INTO users (name, email, password_hash, role, school_id, permissions, active)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, name, email, role, school_id, permissions, active, created_at, updated_at
        `,
        [name, email, passwordHash, role, targetSchoolId, JSON.stringify(permissionsToSave), active]
      );

      const created = sanitizeUser(result.rows[0]);
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: created.schoolId || null,
        action: "create_user",
        resource: "user",
        resourceId: String(created.id),
        afterData: created,
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.status(201).json(created);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "duplicate_email" });
      }
      console.error("POST /api/auth/users error:", error);
      sendInternalError(res, "failed_to_create_user", error);
    }
  }
);

app.patch(
  "/api/auth/users/:id",
  authenticate,
  requirePermission("menus.users"),
  requirePermission("features.users_edit"),
  requireRoles([ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA]),
  async (req, res) => {
  const userId = toIntId(req.params.id);
  if (!userId) return res.status(400).json({ error: "invalid_user_id" });

  try {
    const beforeResult = await pool.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
             s.name AS school_name
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!beforeResult.rowCount) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const before = beforeResult.rows[0];
    const isSuperAdmin = req.user.role === ROLE_SUPERADMIN;
    if (!isSuperAdmin) {
      if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
      if (before.role === ROLE_SUPERADMIN) {
        return res.status(403).json({ error: "cannot_edit_superadmin" });
      }
      if (Number(before.school_id) !== Number(req.user.schoolId)) {
        return res.status(403).json({ error: "school_access_denied" });
      }
    }

    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "name_cannot_be_empty" });
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "email_cannot_be_empty" });
      values.push(email);
      updates.push(`email = $${values.length}`);
    }

    let roleFromPayload = null;
    let schoolIdFromPayload = undefined;

    if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
      const role = String(req.body.role || "").trim();
      if (!ALL_ROLES.includes(role)) return res.status(400).json({ error: "invalid_role" });
      if (!isSuperAdmin && role === ROLE_SUPERADMIN) {
        return res.status(403).json({ error: "cannot_assign_superadmin_role" });
      }
      roleFromPayload = role;
      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "schoolId")) {
      const schoolId = req.body.schoolId === null ? null : toIntId(req.body.schoolId);
      if (req.body.schoolId !== null && !schoolId) {
        return res.status(400).json({ error: "invalid_school_id" });
      }
      if (!isSuperAdmin) {
        if (!schoolId || Number(schoolId) !== Number(req.user.schoolId)) {
          return res.status(403).json({ error: "school_access_denied" });
        }
      }
      schoolIdFromPayload = schoolId;
      values.push(schoolId);
      updates.push(`school_id = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
      if (req.user.id === userId && req.body.active === false) {
        return res.status(400).json({ error: "cannot_deactivate_self" });
      }
      values.push(Boolean(req.body.active));
      updates.push(`active = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "password_reset_requires_superadmin" });
      }
      const password = String(req.body.password || "");
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          error: "weak_password",
          policy: getPasswordPolicyDescription(),
        });
      }
      const hash = await bcrypt.hash(password, 12);
      values.push(hash);
      updates.push(`password_hash = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "permissions")) {
      const permissions = normalizePermissionsPayload(req.body.permissions);
      values.push(JSON.stringify(permissions));
      updates.push(`permissions = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "no_fields_to_update" });
    }

    const nextRole = roleFromPayload || before.role;
    let nextSchoolId =
      schoolIdFromPayload !== undefined ? schoolIdFromPayload : before.school_id || null;

    if (nextRole === ROLE_SUPERADMIN) {
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "cannot_assign_superadmin_role" });
      }
      nextSchoolId = null;
      if (schoolIdFromPayload === undefined) {
        values.push(null);
        updates.push(`school_id = $${values.length}`);
      }
    } else if (!nextSchoolId) {
      return res.status(400).json({ error: "school_id_required_for_non_superadmin" });
    } else {
      if (!isSuperAdmin && Number(nextSchoolId) !== Number(req.user.schoolId)) {
        return res.status(403).json({ error: "school_access_denied" });
      }

      const school = await getSchoolById(pool, nextSchoolId);
      if (!school) {
        return res.status(404).json({ error: "school_not_found" });
      }
      if (school.active === false) {
        return res.status(400).json({ error: "school_inactive" });
      }
    }

    values.push(userId);
    updates.push(`updated_at = NOW()`);

    const updateResult = await pool.query(
      `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, name, email, role, school_id, permissions, active, created_at, updated_at
      `,
      values
    );

    const after = sanitizeUser(updateResult.rows[0]);

    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: after.schoolId || null,
      action: "update_user",
      resource: "user",
      resourceId: String(after.id),
      beforeData: sanitizeUser(before),
      afterData: after,
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { requestId: meta.requestId },
    });

    res.json(after);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "duplicate_email" });
    }
    console.error("PATCH /api/auth/users/:id error:", error);
    sendInternalError(res, "failed_to_update_user", error);
  }
  }
);

app.post(
  "/api/auth/users/:id/reset-password",
  authenticate,
  requirePermission("menus.users"),
  requirePermission("features.users_reset_password"),
  requireRoles([ROLE_SUPERADMIN]),
  async (req, res) => {
    const userId = toIntId(req.params.id);
    const newPassword = String(req.body?.newPassword || "");
    if (!userId) return res.status(400).json({ error: "invalid_user_id" });
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: "weak_password",
        policy: getPasswordPolicyDescription(),
      });
    }

    try {
      const beforeResult = await pool.query(
        `
        SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
               s.name AS school_name
        FROM users u
        LEFT JOIN schools s ON s.id = u.school_id
        WHERE u.id = $1
        LIMIT 1
        `,
        [userId]
      );
      if (!beforeResult.rowCount) {
        return res.status(404).json({ error: "user_not_found" });
      }

      const before = beforeResult.rows[0];
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        `
        UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [passwordHash, userId]
      );

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: before.school_id || null,
        action: "reset_user_password",
        resource: "user",
        resourceId: String(userId),
        beforeData: sanitizeUser(before),
        afterData: { passwordReset: true },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("POST /api/auth/users/:id/reset-password error:", error);
      sendInternalError(res, "failed_to_reset_user_password", error);
    }
  }
);

app.delete(
  "/api/auth/users/:id",
  authenticate,
  requirePermission("menus.users"),
  requirePermission("features.users_disable"),
  requireRoles([ROLE_SUPERADMIN, ROLE_ADMIN_ESCOLA]),
  async (req, res) => {
    const userId = toIntId(req.params.id);
    if (!userId) return res.status(400).json({ error: "invalid_user_id" });

    try {
      const beforeResult = await pool.query(
        `
        SELECT u.id, u.name, u.email, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
               s.name AS school_name
        FROM users u
        LEFT JOIN schools s ON s.id = u.school_id
        WHERE u.id = $1
        LIMIT 1
        `,
        [userId]
      );
      if (!beforeResult.rowCount) {
        return res.status(404).json({ error: "user_not_found" });
      }

      const before = beforeResult.rows[0];
      if (Number(before.id) === Number(req.user.id)) {
        return res.status(400).json({ error: "cannot_deactivate_self" });
      }

      if (req.user.role !== ROLE_SUPERADMIN) {
        if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
        if (before.role === ROLE_SUPERADMIN) {
          return res.status(403).json({ error: "cannot_deactivate_superadmin" });
        }
        if (Number(before.school_id) !== Number(req.user.schoolId)) {
          return res.status(403).json({ error: "school_access_denied" });
        }
      }

      const updateResult = await pool.query(
        `
        UPDATE users
        SET active = FALSE,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, email, role, school_id, permissions, active, created_at, updated_at
        `,
        [userId]
      );
      const after = sanitizeUser(updateResult.rows[0]);

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: after.schoolId || null,
        action: "deactivate_user",
        resource: "user",
        resourceId: String(userId),
        beforeData: sanitizeUser(before),
        afterData: after,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      res.json({ success: true, user: after });
    } catch (error) {
      console.error("DELETE /api/auth/users/:id error:", error);
      sendInternalError(res, "failed_to_deactivate_user", error);
    }
  }
);

app.get("/api/schools", authenticate, async (req, res) => {
  try {
    if (req.user.role === ROLE_SUPERADMIN) {
      const includeInactive = req.query.includeInactive === "true";
      const whereSql = includeInactive ? "" : "WHERE active = TRUE";
      const result = await pool.query(
        `
        SELECT id, name, slug, timezone, active, public_token, created_at
        FROM schools
        ${whereSql}
        ORDER BY name ASC
        `
      );
      return res.json(result.rows.map(mapSchool));
    }

    if (!req.user.schoolId) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT id, name, slug, timezone, active, public_token, created_at
      FROM schools
      WHERE id = $1
      ORDER BY name ASC
      `,
      [req.user.schoolId]
    );
    return res.json(result.rows.map(mapSchool));
  } catch (error) {
    console.error("GET /api/schools error:", error);
    sendInternalError(res, "failed_to_list_schools", error);
  }
});

app.post("/api/schools", authenticate, requireRoles([ROLE_SUPERADMIN]), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const timezone = String(req.body?.timezone || "America/Sao_Paulo").trim();
    const active = req.body?.active === false ? false : true;
    const slug = slugify(req.body?.slug || name);

    if (!name) {
      return res.status(400).json({ error: "name_is_required" });
    }
    if (!slug) {
      return res.status(400).json({ error: "slug_is_required" });
    }

    const result = await pool.query(
      `
      INSERT INTO schools (name, slug, timezone, active, public_token)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, slug, timezone, active, public_token, created_at
      `,
      [name, slug, timezone, active, generateSchoolPublicToken()]
    );

    const created = mapSchool(result.rows[0]);
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: Number(created.id),
      action: "create_school",
      resource: "school",
      resourceId: created.id,
      afterData: created,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    res.status(201).json(created);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "duplicate_school_slug_or_name" });
    }
    console.error("POST /api/schools error:", error);
    sendInternalError(res, "failed_to_create_school", error);
  }
});

app.patch("/api/schools/:id", authenticate, requireRoles([ROLE_SUPERADMIN]), async (req, res) => {
  const schoolId = toIntId(req.params.id);
  if (!schoolId) return res.status(400).json({ error: "invalid_school_id" });

  try {
    const before = await getSchoolById(pool, schoolId);
    if (!before) return res.status(404).json({ error: "school_not_found" });

    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "name_cannot_be_empty" });
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "slug")) {
      const slug = slugify(req.body.slug);
      if (!slug) return res.status(400).json({ error: "slug_cannot_be_empty" });
      values.push(slug);
      updates.push(`slug = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "timezone")) {
      const timezone = String(req.body.timezone || "").trim();
      if (!timezone) return res.status(400).json({ error: "timezone_cannot_be_empty" });
      values.push(timezone);
      updates.push(`timezone = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
      values.push(Boolean(req.body.active));
      updates.push(`active = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "no_fields_to_update" });
    }

    values.push(schoolId);
    const result = await pool.query(
      `
      UPDATE schools
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, name, slug, timezone, active, public_token, created_at
      `,
      values
    );

    const after = mapSchool(result.rows[0]);
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId,
      action: "update_school",
      resource: "school",
      resourceId: String(schoolId),
      beforeData: mapSchool(before),
      afterData: after,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    res.json(after);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "duplicate_school_slug_or_name" });
    }
    console.error("PATCH /api/schools/:id error:", error);
    sendInternalError(res, "failed_to_update_school", error);
  }
});

app.delete("/api/schools/:id", authenticate, requireRoles([ROLE_SUPERADMIN]), async (req, res) => {
  const schoolId = toIntId(req.params.id);
  if (!schoolId) return res.status(400).json({ error: "invalid_school_id" });

  try {
    const before = await getSchoolById(pool, schoolId);
    if (!before) return res.status(404).json({ error: "school_not_found" });

    const result = await pool.query(
      `
      UPDATE schools
      SET active = FALSE
      WHERE id = $1
      RETURNING id, name, slug, timezone, active, public_token, created_at
      `,
      [schoolId]
    );

    const after = mapSchool(result.rows[0]);
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId,
      action: "delete_school_soft",
      resource: "school",
      resourceId: String(schoolId),
      beforeData: mapSchool(before),
      afterData: after,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    res.json({ success: true, school: after });
  } catch (error) {
    console.error("DELETE /api/schools/:id error:", error);
    sendInternalError(res, "failed_to_delete_school", error);
  }
});

app.get(
  "/api/schools/:id/schedule",
  authenticate,
  requireAnyPermission([
    "menus.config",
    "features.dashboard_schedule_interface",
    "features.dashboard_last_signal",
    "features.dashboard_next_signal",
  ]),
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    try {
      const school = await getSchoolById(pool, req.targetSchoolId);
      if (!school) return res.status(404).json({ error: "school_not_found" });
      const schedule = await getScheduleObjectBySchoolId(pool, req.targetSchoolId);
      res.json(schedule);
    } catch (error) {
      console.error("GET /api/schools/:id/schedule error:", error);
      sendInternalError(res, "failed_to_load_schedule", error);
    }
  }
);

app.put(
  "/api/schools/:id/schedule",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_schedule_write"),
  requireWriteAccess,
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    let schedule;
    try {
      schedule = normalizeSchedulePayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: "invalid_schedule_payload", detail: error.message });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const school = await getSchoolById(client, req.targetSchoolId);
      if (!school) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "school_not_found" });
      }

      const shouldAutoApprove = canAutoApproveScheduleChanges(req.user);
      if (!shouldAutoApprove) {
        const requestRow = await upsertPendingScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          schedule
        );

        await client.query("COMMIT");

        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id || null,
          schoolId: req.targetSchoolId,
          action: "propose_schedule_change",
          resource: "schedule_change_request",
          resourceId: String(requestRow.id),
          afterData: {
            status: requestRow.status,
            payloadSummary: summarizeSchedule(schedule),
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });

        return res.status(202).json({
          pendingApproval: true,
          request: mapScheduleChangeRequest({
            ...requestRow,
            school_name: school.name,
            proposed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      let beforeSchedule;
      let autoApprovedRow = null;

      if (req.user.role === ROLE_SUPERADMIN) {
        beforeSchedule = await getScheduleObjectBySchoolId(client, req.targetSchoolId);
      } else {
        const autoApproved = await createAutoApprovedScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          req.user.id || null,
          schedule
        );
        beforeSchedule = autoApproved.beforeSchedule;
        autoApprovedRow = autoApproved.row;
      }

      await replaceSchoolSchedule(client, req.targetSchoolId, schedule);

      await client.query("COMMIT");

      const meta = getRequestMeta(req);
      if (autoApprovedRow) {
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.targetSchoolId,
          action: "auto_approve_schedule_change",
          resource: "schedule_change_request",
          resourceId: String(autoApprovedRow.id),
          beforeData: beforeSchedule,
          afterData: schedule,
          meta: {
            payloadSummary: summarizeSchedule(schedule),
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });

        return res.json({
          autoApproved: true,
          schedule,
          request: mapScheduleChangeRequest({
            ...autoApprovedRow,
            school_name: school.name,
            proposed_by_name: req.user.name || req.user.email || null,
            reviewed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "update_schedule",
        resource: "schedule",
        resourceId: String(req.targetSchoolId),
        beforeData: beforeSchedule,
        afterData: schedule,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.json(schedule);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("PUT /api/schools/:id/schedule error:", error);
      return sendInternalError(res, "failed_to_save_schedule", error);
    } finally {
      client.release();
    }
  }
);

app.get(
  "/api/schools/:id/change-requests",
  authenticate,
  requirePermission("menus.config"),
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    const statusFilter = String(req.query.status || "").trim();
    const allowedStatuses = ["pending", "approved", "rejected", "cancelled"];
    if (statusFilter && !allowedStatuses.includes(statusFilter)) {
      return res.status(400).json({ error: "invalid_change_request_status" });
    }

    const limitRaw = Number.parseInt(String(req.query.limit || "30"), 10);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 30;

    try {
      const values = [req.targetSchoolId];
      const where = ["scr.school_id = $1"];

      if (statusFilter) {
        values.push(statusFilter);
        where.push(`scr.status = $${values.length}`);
      }

      values.push(limit);
      const result = await pool.query(
        `
        SELECT scr.id, scr.school_id, scr.proposed_by, scr.payload, scr.before_payload, scr.status, scr.review_note,
               scr.reviewed_by, scr.reviewed_at, scr.created_at, scr.updated_at,
               s.name AS school_name,
               pu.name AS proposed_by_name,
               ru.name AS reviewed_by_name
        FROM schedule_change_requests scr
        LEFT JOIN schools s ON s.id = scr.school_id
        LEFT JOIN users pu ON pu.id = scr.proposed_by
        LEFT JOIN users ru ON ru.id = scr.reviewed_by
        WHERE ${where.join(" AND ")}
        ORDER BY scr.created_at DESC
        LIMIT $${values.length}
        `,
        values
      );

      return res.json(result.rows.map((row) => mapScheduleChangeRequest(row)));
    } catch (error) {
      console.error("GET /api/schools/:id/change-requests error:", error);
      return sendInternalError(res, "failed_to_list_change_requests", error);
    }
  }
);

app.post(
  "/api/change-requests/:id/approve",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_approve_changes"),
  requireRoles([ROLE_SUPERADMIN]),
  requireWriteAccess,
  async (req, res) => {
    const requestId = toIntId(req.params.id);
    if (!requestId) return res.status(400).json({ error: "invalid_change_request_id" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const requestResult = await client.query(
        `
        SELECT scr.id, scr.school_id, scr.proposed_by, scr.payload, scr.before_payload, scr.status, scr.review_note,
               scr.reviewed_by, scr.reviewed_at, scr.created_at, scr.updated_at,
               (
                 SELECT s.name
                 FROM schools s
                 WHERE s.id = scr.school_id
                 LIMIT 1
               ) AS school_name,
               (
                 SELECT pu.name
                 FROM users pu
                 WHERE pu.id = scr.proposed_by
                 LIMIT 1
               ) AS proposed_by_name,
               (
                 SELECT ru.name
                 FROM users ru
                 WHERE ru.id = scr.reviewed_by
                 LIMIT 1
               ) AS reviewed_by_name
        FROM schedule_change_requests scr
        WHERE scr.id = $1
        LIMIT 1
        FOR UPDATE OF scr
        `,
        [requestId]
      );

      if (!requestResult.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "change_request_not_found" });
      }

      const requestRow = requestResult.rows[0];
      if (requestRow.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "change_request_not_pending" });
      }

      const schedule = normalizeSchedulePayload(requestRow.payload);
      const beforeSchedule = await getScheduleObjectBySchoolId(client, requestRow.school_id);
      await replaceSchoolSchedule(client, requestRow.school_id, schedule);

      const updateResult = await client.query(
        `
        UPDATE schedule_change_requests
        SET status = 'approved',
            reviewed_by = $1,
            reviewed_at = NOW(),
            review_note = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, school_id, proposed_by, payload, before_payload, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
        `,
        [req.user.id, String(req.body?.note || "").trim() || null, requestId]
      );

      await client.query("COMMIT");

      const approvedRow = {
        ...updateResult.rows[0],
        school_name: requestRow.school_name,
        proposed_by_name: requestRow.proposed_by_name,
        reviewed_by_name: req.user.name || req.user.email || null,
      };
      const mapped = mapScheduleChangeRequest(approvedRow);

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: requestRow.school_id,
        action: "approve_schedule_change",
        resource: "schedule_change_request",
        resourceId: String(requestId),
        beforeData: beforeSchedule,
        afterData: schedule,
        meta: {
          payloadSummary: summarizeSchedule(schedule),
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.json({
        success: true,
        request: mapped,
        schedule,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("POST /api/change-requests/:id/approve error:", error);
      return sendInternalError(res, "failed_to_approve_change_request", error);
    } finally {
      client.release();
    }
  }
);

app.post(
  "/api/change-requests/:id/reject",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_approve_changes"),
  requireRoles([ROLE_SUPERADMIN]),
  requireWriteAccess,
  async (req, res) => {
    const requestId = toIntId(req.params.id);
    if (!requestId) return res.status(400).json({ error: "invalid_change_request_id" });

    try {
      const requestResult = await pool.query(
        `
        SELECT scr.id, scr.school_id, scr.proposed_by, scr.payload, scr.before_payload, scr.status, scr.review_note,
               scr.reviewed_by, scr.reviewed_at, scr.created_at, scr.updated_at,
               s.name AS school_name,
               pu.name AS proposed_by_name,
               ru.name AS reviewed_by_name
        FROM schedule_change_requests scr
        LEFT JOIN schools s ON s.id = scr.school_id
        LEFT JOIN users pu ON pu.id = scr.proposed_by
        LEFT JOIN users ru ON ru.id = scr.reviewed_by
        WHERE scr.id = $1
          AND scr.status = 'pending'
        LIMIT 1
        `,
        [requestId]
      );

      if (!requestResult.rowCount) {
        return res.status(404).json({ error: "change_request_not_found_or_not_pending" });
      }

      const note = String(req.body?.note || "").trim() || null;
      const updateResult = await pool.query(
        `
        UPDATE schedule_change_requests
        SET status = 'rejected',
            reviewed_by = $1,
            reviewed_at = NOW(),
            review_note = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, school_id, proposed_by, payload, before_payload, status, review_note, reviewed_by, reviewed_at, created_at, updated_at
        `,
        [req.user.id, note, requestId]
      );

      const rejectedRow = {
        ...updateResult.rows[0],
        school_name: requestResult.rows[0].school_name,
        proposed_by_name: requestResult.rows[0].proposed_by_name,
        reviewed_by_name: req.user.name || req.user.email || null,
      };
      const mapped = mapScheduleChangeRequest(rejectedRow);

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: mapped.schoolId,
        action: "reject_schedule_change",
        resource: "schedule_change_request",
        resourceId: String(requestId),
        afterData: {
          status: "rejected",
          note,
          payloadSummary: mapped.payloadSummary,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.json({
        success: true,
        request: mapped,
      });
    } catch (error) {
      console.error("POST /api/change-requests/:id/reject error:", error);
      return sendInternalError(res, "failed_to_reject_change_request", error);
    }
  }
);

app.get("/api/templates", authenticate, requirePermission("menus.config"), async (req, res) => {
  try {
    const requestedSchoolId = req.query.schoolId ? toIntId(req.query.schoolId) : null;
    const values = [];
    const where = [];

    if (req.user.role !== ROLE_SUPERADMIN) {
      if (!req.user.schoolId) return res.json([]);
      values.push(req.user.schoolId);
      where.push(`t.source_school_id = $${values.length}`);
    } else if (requestedSchoolId) {
      values.push(requestedSchoolId);
      where.push(`t.source_school_id = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await pool.query(
      `
      SELECT t.id, t.name, t.description, t.source_school_id, t.payload, t.created_by, t.created_at,
             s.name AS source_school_name, u.name AS creator_name
      FROM schedule_templates t
      LEFT JOIN schools s ON s.id = t.source_school_id
      LEFT JOIN users u ON u.id = t.created_by
      ${whereSql}
      ORDER BY t.created_at DESC
      `,
      values
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sourceSchoolId: row.source_school_id,
        sourceSchoolName: row.source_school_name || null,
        payload: row.payload,
        createdBy: row.created_by,
        creatorName: row.creator_name || null,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error("GET /api/templates error:", error);
    sendInternalError(res, "failed_to_list_templates", error);
  }
});

app.get("/api/audio-tracks", authenticate, async (req, res) => {
  const includeInactive =
    req.query.includeInactive === "true" &&
    hasEffectivePermission(req.user, "features.audio_manage");
  try {
    const result = await pool.query(
      `
      SELECT at.id, at.name, at.storage_path, at.public_url, at.mime_type, at.size_bytes,
             at.duration_seconds, at.active, at.created_by, at.created_at, at.updated_at,
             u.name AS created_by_name
      FROM audio_tracks at
      LEFT JOIN users u ON u.id = at.created_by
      ${includeInactive ? "" : "WHERE at.active = TRUE"}
      ORDER BY at.name ASC
      `
    );
    res.json(result.rows.map(mapAudioTrack));
  } catch (error) {
    console.error("GET /api/audio-tracks error:", error);
    sendInternalError(res, "failed_to_list_audio_tracks", error);
  }
});

app.get(
  "/api/audio-tracks/stats",
  authenticate,
  requirePermission("menus.audios"),
  requirePermission("features.audio_manage"),
  async (_req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total_tracks,
          COUNT(*) FILTER (WHERE active = TRUE)::int AS active_tracks,
          COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes,
          COALESCE(SUM(size_bytes) FILTER (WHERE active = TRUE), 0)::bigint AS active_size_bytes
        FROM audio_tracks
        `
      );
      const row = result.rows[0] || {};
      const totalSizeBytes = Number(row.total_size_bytes) || 0;
      res.json({
        totalTracks: Number(row.total_tracks) || 0,
        activeTracks: Number(row.active_tracks) || 0,
        totalSizeBytes,
        activeSizeBytes: Number(row.active_size_bytes) || 0,
        softLimitBytes: AUDIO_STORAGE_SOFT_LIMIT_BYTES,
        warningThresholdBytes: Math.floor(AUDIO_STORAGE_SOFT_LIMIT_BYTES * 0.8),
        warning: totalSizeBytes >= AUDIO_STORAGE_SOFT_LIMIT_BYTES * 0.8,
        uploadMaxBytes: AUDIO_UPLOAD_MAX_BYTES,
      });
    } catch (error) {
      console.error("GET /api/audio-tracks/stats error:", error);
      sendInternalError(res, "failed_to_get_audio_track_stats", error);
    }
  }
);

app.post(
  "/api/audio-tracks",
  authenticate,
  requirePermission("menus.audios"),
  requirePermission("features.audio_manage"),
  requireWriteAccess,
  async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const audioBase64 = String(req.body?.audioBase64 || "").trim();
    const mimeType = String(req.body?.mimeType || "audio/wav").trim().toLowerCase();
    const originalFileName = String(req.body?.originalFileName || "").trim();
    const durationSeconds = Number.parseInt(
      String(req.body?.durationSeconds || AUDIO_CLIP_DURATION_SECONDS),
      10
    );

    if (!name) return res.status(400).json({ error: "name_is_required" });
    if (!audioBase64) return res.status(400).json({ error: "audio_clip_required" });
    if (!["audio/wav", "audio/wave", "audio/x-wav"].includes(mimeType)) {
      return res.status(400).json({ error: "unsupported_audio_clip_type" });
    }

    let buffer;
    try {
      buffer = Buffer.from(audioBase64, "base64");
    } catch (_error) {
      return res.status(400).json({ error: "invalid_audio_clip" });
    }

    if (!buffer.length) return res.status(400).json({ error: "empty_audio_clip" });
    if (buffer.length > AUDIO_UPLOAD_MAX_BYTES) {
      return res.status(413).json({ error: "audio_clip_too_large" });
    }

    const safeName = slugify(name).slice(0, 80) || "audio";
    const storagePath = `clips/${Date.now()}-${crypto.randomUUID()}-${safeName}.wav`;
    const contentType = "audio/wav";

    try {
      await uploadAudioClipToSupabase(storagePath, buffer, contentType);
      const publicUrl = getSupabasePublicStorageUrl(storagePath);
      const result = await pool.query(
        `
        INSERT INTO audio_tracks (
          name, storage_path, public_url, mime_type, size_bytes,
          duration_seconds, active, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)
        RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                  duration_seconds, active, created_by, created_at, updated_at
        `,
        [
          name,
          storagePath,
          publicUrl,
          contentType,
          buffer.length,
          Number.isInteger(durationSeconds) ? durationSeconds : AUDIO_CLIP_DURATION_SECONDS,
          req.user.id || null,
        ]
      );

      const created = mapAudioTrack(result.rows[0]);
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.user.schoolId || null,
        action: "create_audio_track",
        resource: "audio_track",
        resourceId: String(created.id),
        afterData: {
          name: created.name,
          storagePath: created.storagePath,
          sizeBytes: created.sizeBytes,
          originalFileName,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.status(201).json(created);
    } catch (error) {
      if (error?.code === "SUPABASE_STORAGE_NOT_CONFIGURED") {
        return res.status(503).json({ error: "supabase_storage_not_configured" });
      }
      console.error("POST /api/audio-tracks error:", error);
      sendInternalError(res, "failed_to_create_audio_track", error);
    }
  }
);

app.patch(
  "/api/audio-tracks/:id",
  authenticate,
  requirePermission("menus.audios"),
  requirePermission("features.audio_manage"),
  requireWriteAccess,
  async (req, res) => {
    const audioTrackId = toIntId(req.params.id);
    if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

    const updates = [];
    const values = [];
    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "name_cannot_be_empty" });
      values.push(name);
      updates.push(`name = $${values.length}`);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "active")) {
      values.push(Boolean(req.body.active));
      updates.push(`active = $${values.length}`);
    }
    if (!updates.length) return res.status(400).json({ error: "no_fields_to_update" });

    try {
      values.push(audioTrackId);
      const result = await pool.query(
        `
        UPDATE audio_tracks
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                  duration_seconds, active, created_by, created_at, updated_at
        `,
        values
      );
      if (!result.rowCount) return res.status(404).json({ error: "audio_track_not_found" });

      const updated = mapAudioTrack(result.rows[0]);
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.user.schoolId || null,
        action: "update_audio_track",
        resource: "audio_track",
        resourceId: String(updated.id),
        afterData: updated,
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });
      res.json(updated);
    } catch (error) {
      console.error("PATCH /api/audio-tracks/:id error:", error);
      sendInternalError(res, "failed_to_update_audio_track", error);
    }
  }
);

app.delete(
  "/api/audio-tracks/:id",
  authenticate,
  requirePermission("menus.audios"),
  requirePermission("features.audio_manage"),
  requireWriteAccess,
  async (req, res) => {
    const audioTrackId = toIntId(req.params.id);
    if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

    try {
      const result = await pool.query(
        `
        UPDATE audio_tracks
        SET active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, storage_path, public_url, mime_type, size_bytes,
                  duration_seconds, active, created_by, created_at, updated_at
        `,
        [audioTrackId]
      );
      if (!result.rowCount) return res.status(404).json({ error: "audio_track_not_found" });

      const updated = mapAudioTrack(result.rows[0]);
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.user.schoolId || null,
        action: "deactivate_audio_track",
        resource: "audio_track",
        resourceId: String(updated.id),
        afterData: updated,
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });
      res.json({ success: true, audioTrack: updated });
    } catch (error) {
      console.error("DELETE /api/audio-tracks/:id error:", error);
      sendInternalError(res, "failed_to_deactivate_audio_track", error);
    }
  }
);

app.delete(
  "/api/audio-tracks/:id/permanent",
  authenticate,
  requirePermission("menus.audios"),
  requirePermission("features.audio_manage"),
  requireWriteAccess,
  async (req, res) => {
    const audioTrackId = toIntId(req.params.id);
    if (!audioTrackId) return res.status(400).json({ error: "invalid_audio_track_id" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const trackResult = await client.query(
        `
        SELECT id, name, storage_path, public_url, mime_type, size_bytes,
               duration_seconds, active, created_by, created_at, updated_at
        FROM audio_tracks
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [audioTrackId]
      );
      if (!trackResult.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "audio_track_not_found" });
      }

      const track = trackResult.rows[0];
      const usageResult = await client.query(
        `
        SELECT COUNT(*)::int AS total
        FROM schedules
        WHERE music = $1
        `,
        [track.public_url]
      );
      const usageCount = Number(usageResult.rows[0]?.total) || 0;
      if (usageCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "audio_track_in_use",
          usageCount,
        });
      }

      await client.query("DELETE FROM audio_tracks WHERE id = $1", [audioTrackId]);
      await client.query("COMMIT");

      try {
        await deleteAudioClipFromSupabase(track.storage_path);
      } catch (storageError) {
        console.error("Supabase audio delete error:", storageError);
      }

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.user.schoolId || null,
        action: "delete_audio_track_permanent",
        resource: "audio_track",
        resourceId: String(audioTrackId),
        beforeData: mapAudioTrack(track),
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("DELETE /api/audio-tracks/:id/permanent error:", error);
      sendInternalError(res, "failed_to_delete_audio_track_permanently", error);
    } finally {
      client.release();
    }
  }
);

app.post(
  "/api/templates",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_templates"),
  requireWriteAccess,
  async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim() || null;
  const sourceSchoolId =
    req.user.role === ROLE_SUPERADMIN
      ? toIntId(req.body?.sourceSchoolId)
      : req.user.schoolId;

  if (!name) return res.status(400).json({ error: "name_is_required" });
  if (!sourceSchoolId) return res.status(400).json({ error: "source_school_id_required" });
  if (!canAccessSchool(req.user, sourceSchoolId)) {
    return res.status(403).json({ error: "school_access_denied" });
  }

  const client = await pool.connect();
  try {
    const school = await getSchoolById(client, sourceSchoolId);
    if (!school) return res.status(404).json({ error: "school_not_found" });

    const payload = await getScheduleObjectBySchoolId(client, sourceSchoolId);
    const result = await client.query(
      `
      INSERT INTO schedule_templates (name, description, source_school_id, payload, created_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, description, source_school_id, payload, created_by, created_at
      `,
      [name, description, sourceSchoolId, JSON.stringify(payload), req.user.id]
    );

    const template = result.rows[0];
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: sourceSchoolId,
      action: "create_template",
      resource: "schedule_template",
      resourceId: String(template.id),
      afterData: {
        name: template.name,
        sourceSchoolId,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    res.status(201).json({
      id: template.id,
      name: template.name,
      description: template.description,
      sourceSchoolId: template.source_school_id,
      payload: template.payload,
      createdBy: template.created_by,
      createdAt: template.created_at,
    });
  } catch (error) {
    console.error("POST /api/templates error:", error);
    sendInternalError(res, "failed_to_create_template", error);
  } finally {
    client.release();
  }
  }
);

app.post(
  "/api/templates/:id/clone-to-school",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_templates"),
  requireWriteAccess,
  async (req, res) => {
  const templateId = toIntId(req.params.id);
  const requestedTargetSchoolId = toIntId(req.body?.targetSchoolId);
  const targetSchoolId =
    req.user.role === ROLE_SUPERADMIN ? requestedTargetSchoolId : req.user.schoolId;

  if (!templateId || !targetSchoolId) {
    return res.status(400).json({ error: "invalid_template_or_school_id" });
  }

  if (!canAccessSchool(req.user, targetSchoolId)) {
    return res.status(403).json({ error: "school_access_denied" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const templateResult = await client.query(
      `
      SELECT id, name, description, source_school_id, payload
      FROM schedule_templates
      WHERE id = $1
      LIMIT 1
      `,
      [templateId]
    );
    if (!templateResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "template_not_found" });
    }

    const template = templateResult.rows[0];
    if (
      req.user.role !== ROLE_SUPERADMIN &&
      Number(template.source_school_id) !== Number(req.user.schoolId)
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "template_access_denied" });
    }

    const targetSchool = await getSchoolById(client, targetSchoolId);
    if (!targetSchool) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "target_school_not_found" });
    }

    const payload = normalizeSchedulePayload(template.payload);
    const shouldAutoApprove = canAutoApproveScheduleChanges(req.user);
    if (!shouldAutoApprove) {
      const requestRow = await upsertPendingScheduleChangeRequest(
        client,
        targetSchoolId,
        req.user.id || null,
        payload
      );
      await client.query("COMMIT");

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id || null,
        schoolId: targetSchoolId,
        action: "propose_template_clone_to_school",
        resource: "schedule_change_request",
        resourceId: String(requestRow.id),
        afterData: {
          templateId: template.id,
          payloadSummary: summarizeSchedule(payload),
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.status(202).json({
        pendingApproval: true,
        templateId: template.id,
        targetSchoolId,
        request: mapScheduleChangeRequest({
          ...requestRow,
          school_name: targetSchool.name,
          proposed_by_name: req.user.name || req.user.email || null,
        }),
      });
    }

    let beforeSchedule;
    let autoApprovedRow = null;
    if (req.user.role === ROLE_SUPERADMIN) {
      beforeSchedule = await getScheduleObjectBySchoolId(client, targetSchoolId);
    } else {
      const autoApproved = await createAutoApprovedScheduleChangeRequest(
        client,
        targetSchoolId,
        req.user.id || null,
        req.user.id || null,
        payload
      );
      beforeSchedule = autoApproved.beforeSchedule;
      autoApprovedRow = autoApproved.row;
    }

    await replaceSchoolSchedule(client, targetSchoolId, payload);
    await client.query("COMMIT");

    const meta = getRequestMeta(req);
    if (autoApprovedRow) {
      await writeAuditLog({
        userId: req.user.id,
        schoolId: targetSchoolId,
        action: "auto_approve_template_clone_to_school",
        resource: "schedule_change_request",
        resourceId: String(autoApprovedRow.id),
        beforeData: beforeSchedule,
        afterData: payload,
        meta: {
          templateName: template.name,
          sourceSchoolId: template.source_school_id,
          targetSchoolId,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.json({
        success: true,
        autoApproved: true,
        templateId: template.id,
        targetSchoolId,
        schedule: payload,
        request: mapScheduleChangeRequest({
          ...autoApprovedRow,
          school_name: targetSchool.name,
          proposed_by_name: req.user.name || req.user.email || null,
          reviewed_by_name: req.user.name || req.user.email || null,
        }),
      });
    }

    await writeAuditLog({
      userId: req.user.id,
      schoolId: targetSchoolId,
      action: "clone_template_to_school",
      resource: "schedule_template",
      resourceId: String(template.id),
      beforeData: beforeSchedule,
      afterData: payload,
      meta: {
        templateName: template.name,
        sourceSchoolId: template.source_school_id,
        targetSchoolId,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return res.json({
      success: true,
      templateId: template.id,
      targetSchoolId,
      schedule: payload,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/templates/:id/clone-to-school error:", error);
    sendInternalError(res, "failed_to_clone_template", error);
  } finally {
    client.release();
  }
  }
);

app.get(
  "/api/schools/:id/backup",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_backup_export"),
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    try {
      const school = await getSchoolById(pool, req.targetSchoolId);
      if (!school) return res.status(404).json({ error: "school_not_found" });
      const schedule = await getScheduleObjectBySchoolId(pool, req.targetSchoolId);

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        school: mapSchool(school),
        schedule,
      };
      const snapshot = await saveSchoolBackupSnapshot(pool, {
        schoolId: req.targetSchoolId,
        schedule,
        createdBy: req.user.id,
        trigger: "manual_export",
        metadata: { exportedAt: backup.exportedAt },
      });
      backup.backupId = snapshot?.id || null;

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "export_backup",
        resource: "backup",
        resourceId: String(req.targetSchoolId),
        afterData: { exportedAt: backup.exportedAt },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      res.json(backup);
    } catch (error) {
      console.error("GET /api/schools/:id/backup error:", error);
      sendInternalError(res, "failed_to_export_backup", error);
    }
  }
);

app.get(
  "/api/schools/:id/backups",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_backup_export"),
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    const limitRaw = Number.parseInt(String(req.query.limit || "30"), 10);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 30;

    try {
      const result = await pool.query(
        `
        SELECT b.id, b.school_id, b.schedule, b.metadata, b.created_by, b.trigger, b.created_at,
               u.name AS created_by_name
        FROM school_backups b
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.school_id = $1
        ORDER BY b.created_at DESC
        LIMIT $2
        `,
        [req.targetSchoolId, limit]
      );

      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "view_backup_snapshots",
        resource: "backup",
        resourceId: String(req.targetSchoolId),
        afterData: {
          requestedLimit: limit,
          returnedCount: result.rowCount || 0,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.json(
        result.rows.map((row) => ({
          id: row.id,
          schoolId: row.school_id,
          trigger: row.trigger,
          metadata: row.metadata,
          createdBy: row.created_by,
          createdByName: row.created_by_name || null,
          createdAt: row.created_at,
          summary: summarizeSchedule(row.schedule),
        }))
      );
    } catch (error) {
      console.error("GET /api/schools/:id/backups error:", error);
      sendInternalError(res, "failed_to_list_backups", error);
    }
  }
);

app.get(
  "/api/schools/:id/backups/:backupId",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_backup_export"),
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    const backupId = toIntId(req.params.backupId);
    if (!backupId) return res.status(400).json({ error: "invalid_backup_id" });

    try {
      const result = await pool.query(
        `
        SELECT b.id, b.school_id, b.schedule, b.metadata, b.created_by, b.trigger, b.created_at,
               u.name AS created_by_name
        FROM school_backups b
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.id = $1
          AND b.school_id = $2
        LIMIT 1
        `,
        [backupId, req.targetSchoolId]
      );
      if (!result.rowCount) {
        return res.status(404).json({ error: "backup_not_found" });
      }

      const row = result.rows[0];
      const meta = getRequestMeta(req);
      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "view_backup_snapshot",
        resource: "backup",
        resourceId: String(backupId),
        afterData: {
          trigger: row.trigger,
          createdAt: row.created_at,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      res.json({
        id: row.id,
        schoolId: row.school_id,
        trigger: row.trigger,
        metadata: row.metadata,
        createdBy: row.created_by,
        createdByName: row.created_by_name || null,
        createdAt: row.created_at,
        summary: summarizeSchedule(row.schedule),
        schedule: row.schedule,
      });
    } catch (error) {
      console.error("GET /api/schools/:id/backups/:backupId error:", error);
      sendInternalError(res, "failed_to_load_backup", error);
    }
  }
);

app.post(
  "/api/schools/:id/restore",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_backup_import"),
  requireWriteAccess,
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    let schedule;
    try {
      schedule = normalizeSchedulePayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: "invalid_backup_payload", detail: error.message });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const school = await getSchoolById(client, req.targetSchoolId);
      if (!school) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "school_not_found" });
      }

      const shouldAutoApprove = canAutoApproveScheduleChanges(req.user);
      if (!shouldAutoApprove) {
        const requestRow = await upsertPendingScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          schedule
        );
        await client.query("COMMIT");

        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id || null,
          schoolId: req.targetSchoolId,
          action: "propose_restore_backup",
          resource: "schedule_change_request",
          resourceId: String(requestRow.id),
          afterData: {
            payloadSummary: summarizeSchedule(schedule),
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });

        return res.status(202).json({
          pendingApproval: true,
          request: mapScheduleChangeRequest({
            ...requestRow,
            school_name: school.name,
            proposed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      let beforeSchedule;
      let autoApprovedRow = null;
      if (req.user.role === ROLE_SUPERADMIN) {
        beforeSchedule = await getScheduleObjectBySchoolId(client, req.targetSchoolId);
      } else {
        const autoApproved = await createAutoApprovedScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          req.user.id || null,
          schedule
        );
        beforeSchedule = autoApproved.beforeSchedule;
        autoApprovedRow = autoApproved.row;
      }

      await replaceSchoolSchedule(client, req.targetSchoolId, schedule);
      await client.query("COMMIT");

      const meta = getRequestMeta(req);
      if (autoApprovedRow) {
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.targetSchoolId,
          action: "auto_approve_restore_backup",
          resource: "schedule_change_request",
          resourceId: String(autoApprovedRow.id),
          beforeData: beforeSchedule,
          afterData: schedule,
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });

        return res.json({
          success: true,
          autoApproved: true,
          schedule,
          request: mapScheduleChangeRequest({
            ...autoApprovedRow,
            school_name: school.name,
            proposed_by_name: req.user.name || req.user.email || null,
            reviewed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "restore_backup",
        resource: "backup",
        resourceId: String(req.targetSchoolId),
        beforeData: beforeSchedule,
        afterData: schedule,
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { requestId: meta.requestId },
      });

      return res.json({ success: true, schedule });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("POST /api/schools/:id/restore error:", error);
      sendInternalError(res, "failed_to_restore_backup", error);
    } finally {
      client.release();
    }
  }
);

app.post(
  "/api/schools/:id/restore-backup",
  authenticate,
  requirePermission("menus.config"),
  requirePermission("features.config_backup_restore"),
  requireWriteAccess,
  requireSchoolScope({ paramName: "id" }),
  async (req, res) => {
    const backupId = toIntId(req.body?.backupId);
    if (!backupId) return res.status(400).json({ error: "invalid_backup_id" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const backupResult = await client.query(
        `
        SELECT id, school_id, schedule, trigger, created_at, created_by
        FROM school_backups
        WHERE id = $1
          AND school_id = $2
        LIMIT 1
        `,
        [backupId, req.targetSchoolId]
      );
      if (!backupResult.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "backup_not_found" });
      }

      const backup = backupResult.rows[0];
      const schedule = normalizeSchedulePayload(backup.schedule);

      const shouldAutoApprove = canAutoApproveScheduleChanges(req.user);
      if (!shouldAutoApprove) {
        const school = await getSchoolById(client, req.targetSchoolId);
        const requestRow = await upsertPendingScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          schedule
        );
        await client.query("COMMIT");

        const meta = getRequestMeta(req);
        await writeAuditLog({
          userId: req.user.id || null,
          schoolId: req.targetSchoolId,
          action: "propose_restore_backup_snapshot",
          resource: "schedule_change_request",
          resourceId: String(requestRow.id),
          afterData: {
            backupId,
            payloadSummary: summarizeSchedule(schedule),
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          meta: { requestId: meta.requestId },
        });

        return res.status(202).json({
          pendingApproval: true,
          request: mapScheduleChangeRequest({
            ...requestRow,
            school_name: school?.name || null,
            proposed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      let beforeSchedule;
      let autoApprovedRow = null;
      if (req.user.role === ROLE_SUPERADMIN) {
        beforeSchedule = await getScheduleObjectBySchoolId(client, req.targetSchoolId);
      } else {
        const autoApproved = await createAutoApprovedScheduleChangeRequest(
          client,
          req.targetSchoolId,
          req.user.id || null,
          req.user.id || null,
          schedule
        );
        beforeSchedule = autoApproved.beforeSchedule;
        autoApprovedRow = autoApproved.row;
      }

      await replaceSchoolSchedule(client, req.targetSchoolId, schedule);
      await client.query("COMMIT");

      const meta = getRequestMeta(req);
      if (autoApprovedRow) {
        await writeAuditLog({
          userId: req.user.id,
          schoolId: req.targetSchoolId,
          action: "auto_approve_restore_backup_snapshot",
          resource: "schedule_change_request",
          resourceId: String(autoApprovedRow.id),
          beforeData: beforeSchedule,
          afterData: schedule,
          meta: {
            requestId: meta.requestId,
            backupId: backup.id,
            trigger: backup.trigger,
            backupCreatedAt: backup.created_at,
            backupCreatedBy: backup.created_by,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });

        return res.json({
          success: true,
          autoApproved: true,
          backupId: backup.id,
          schedule,
          request: mapScheduleChangeRequest({
            ...autoApprovedRow,
            school_name: (await getSchoolById(client, req.targetSchoolId))?.name || null,
            proposed_by_name: req.user.name || req.user.email || null,
            reviewed_by_name: req.user.name || req.user.email || null,
          }),
        });
      }

      await writeAuditLog({
        userId: req.user.id,
        schoolId: req.targetSchoolId,
        action: "restore_backup_snapshot",
        resource: "backup",
        resourceId: String(backup.id),
        beforeData: beforeSchedule,
        afterData: schedule,
        meta: {
          requestId: meta.requestId,
          trigger: backup.trigger,
          backupCreatedAt: backup.created_at,
          backupCreatedBy: backup.created_by,
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return res.json({ success: true, backupId: backup.id, schedule });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("POST /api/schools/:id/restore-backup error:", error);
      sendInternalError(res, "failed_to_restore_selected_backup", error);
    } finally {
      client.release();
    }
  }
);

app.get(
  "/api/audit-logs",
  authenticate,
  requirePermission("menus.audit"),
  requirePermission("features.audit_view"),
  async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit || "100"), 10);
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
  const schoolIdFilter = req.query.schoolId ? toIntId(req.query.schoolId) : null;
  const userIdFilter = req.query.userId ? toIntId(req.query.userId) : null;
  const fromFilter = req.query.from ? parseDateFilter(req.query.from) : null;
  const toFilter = req.query.to ? parseDateFilter(req.query.to, { endOfDay: true }) : null;

  if (req.query.from && !fromFilter) {
    return res.status(400).json({ error: "invalid_from_date" });
  }
  if (req.query.to && !toFilter) {
    return res.status(400).json({ error: "invalid_to_date" });
  }

  try {
    const values = [];
    const where = [];

    if (req.user.role !== ROLE_SUPERADMIN) {
      if (!req.user.schoolId) return res.json([]);
      values.push(req.user.schoolId);
      where.push(`al.school_id = $${values.length}`);
    } else if (schoolIdFilter) {
      values.push(schoolIdFilter);
      where.push(`al.school_id = $${values.length}`);
    }

    if (req.query.action) {
      values.push(String(req.query.action));
      where.push(`al.action = $${values.length}`);
    }

    if (userIdFilter) {
      values.push(userIdFilter);
      where.push(`al.user_id = $${values.length}`);
    }

    if (fromFilter) {
      values.push(fromFilter);
      where.push(`al.created_at >= $${values.length}`);
    }

    if (toFilter) {
      values.push(toFilter);
      where.push(`al.created_at <= $${values.length}`);
    }

    values.push(limit);
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT al.id, al.user_id, al.school_id, al.action, al.resource, al.resource_id,
             al.before_data, al.after_data, al.meta, al.ip, al.user_agent, al.created_at,
             u.name AS user_name, s.name AS school_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN schools s ON s.id = al.school_id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT $${values.length}
      `,
      values
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || null,
        schoolId: row.school_id,
        schoolName: row.school_name || null,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        beforeData: row.before_data,
        afterData: row.after_data,
        meta: row.meta,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    sendInternalError(res, "failed_to_list_audit_logs", error);
  }
  }
);

app.get(
  "/api/alerts",
  authenticate,
  requirePermission("menus.dashboard"),
  requireAnyPermission(["features.dashboard_open_alerts", "features.dashboard_monitor_alerts"]),
  async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const schoolIdFilter = req.query.schoolId ? toIntId(req.query.schoolId) : null;
    const values = [];
    const where = [];

    if (status && ["open", "resolved"].includes(status)) {
      values.push(status);
      where.push(`a.status = $${values.length}`);
    }

    if (req.user.role !== ROLE_SUPERADMIN) {
      if (!req.user.schoolId) return res.json([]);
      values.push(req.user.schoolId);
      where.push(`(a.school_id = $${values.length} OR a.school_id IS NULL)`);
    } else if (schoolIdFilter) {
      values.push(schoolIdFilter);
      where.push(`a.school_id = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await pool.query(
      `
      SELECT a.id, a.type, a.severity, a.school_id, a.message, a.details, a.status, a.fingerprint,
             a.created_at, a.updated_at, a.resolved_at, a.resolved_by,
             s.name AS school_name, u.name AS resolved_by_name
      FROM alerts a
      LEFT JOIN schools s ON s.id = a.school_id
      LEFT JOIN users u ON u.id = a.resolved_by
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT 500
      `,
      values
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        schoolId: row.school_id,
        schoolName: row.school_name || null,
        message: row.message,
        details: row.details,
        status: row.status,
        fingerprint: row.fingerprint,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by,
        resolvedByName: row.resolved_by_name || null,
      }))
    );
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    sendInternalError(res, "failed_to_list_alerts", error);
  }
  }
);

app.patch("/api/alerts/:id/resolve", authenticate, requireWriteAccess, async (req, res) => {
  const alertId = toIntId(req.params.id);
  if (!alertId) return res.status(400).json({ error: "invalid_alert_id" });

  try {
    let result;
    if (req.user.role === ROLE_SUPERADMIN) {
      result = await pool.query(
        `
        UPDATE alerts
        SET status = 'resolved',
            resolved_at = NOW(),
            resolved_by = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, school_id, type, status
        `,
        [alertId, req.user.id]
      );
    } else {
      result = await pool.query(
        `
        UPDATE alerts
        SET status = 'resolved',
            resolved_at = NOW(),
            resolved_by = $2,
            updated_at = NOW()
        WHERE id = $1
          AND school_id = $3
        RETURNING id, school_id, type, status
        `,
        [alertId, req.user.id, req.user.schoolId]
      );
    }

    if (!result.rowCount) {
      return res.status(404).json({ error: "alert_not_found_or_no_access" });
    }

    const row = result.rows[0];
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: row.school_id || null,
      action: "resolve_alert",
      resource: "alert",
      resourceId: String(row.id),
      afterData: row,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    res.json({ success: true, alert: row });
  } catch (error) {
    console.error("PATCH /api/alerts/:id/resolve error:", error);
    sendInternalError(res, "failed_to_resolve_alert", error);
  }
});

app.post("/api/monitor/playback-error", authenticate, async (req, res) => {
  const explicitSchoolId = req.body?.schoolId ? toIntId(req.body.schoolId) : null;
  const schoolId = explicitSchoolId || req.user.schoolId;
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};

  if (!schoolId) return res.status(400).json({ error: "school_id_required" });
  if (!message) return res.status(400).json({ error: "message_required" });
  if (!canAccessSchool(req.user, schoolId)) {
    return res.status(403).json({ error: "school_access_denied" });
  }

  const fingerprint = `playback_error:${schoolId}:${slugify(message).slice(0, 120)}`;
  const client = await pool.connect();
  try {
    const alert = await upsertAlert(client, {
      type: "playback_error",
      severity: "warning",
      schoolId,
      message,
      fingerprint,
      details: {
        ...context,
        reportedAt: new Date().toISOString(),
      },
    });

    const meta = getRequestMeta(req);
    await writeAuditLog(
      {
        userId: req.user.id,
        schoolId,
        action: "report_playback_error",
        resource: "alert",
        resourceId: String(alert.id),
        afterData: { message, context },
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      client
    );

    res.status(201).json({ success: true, alert });
  } catch (error) {
    console.error("POST /api/monitor/playback-error error:", error);
    sendInternalError(res, "failed_to_report_playback_error", error);
  } finally {
    client.release();
  }
});

app.get(
  "/api/monitor/status",
  authenticate,
  requirePermission("menus.dashboard"),
  requirePermission("features.dashboard_schools_without_schedule"),
  async (req, res) => {
  try {
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    const dbLatencyMs = Date.now() - dbStart;
    const uptimeSeconds = Math.max(0, Math.floor((Date.now() - SERVER_STARTED_AT.getTime()) / 1000));

    if (req.user.role === ROLE_SUPERADMIN) {
      const sweep = await runMonitoringSweep("manual", req.user.id);

      const openAlerts = await pool.query(
        `
        SELECT severity, COUNT(*)::int AS total
        FROM alerts
        WHERE status = 'open'
        GROUP BY severity
        `
      );

      const schools = await pool.query(
        "SELECT COUNT(*)::int AS total FROM schools WHERE active = TRUE"
      );
      const users = await pool.query("SELECT COUNT(*)::int AS total FROM users WHERE active = TRUE");
      const pendingApprovals = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM schedule_change_requests
        WHERE status = 'pending'
        `
      );
      const playbackFailures = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM alerts
        WHERE type = 'playback_error'
          AND created_at >= NOW() - INTERVAL '24 hours'
        `
      );
      const schoolsStatusResult = await pool.query(
        `
        SELECT s.id,
               s.name,
               COUNT(sc.id)::int AS schedule_count,
               COALESCE(oa.total, 0)::int AS open_alerts,
               COALESCE(pr.total, 0)::int AS pending_requests,
               COALESCE(pf.total, 0)::int AS playback_failures_24h
        FROM schools s
        LEFT JOIN schedules sc ON sc.school_id = s.id
        LEFT JOIN (
          SELECT school_id, COUNT(*)::int AS total
          FROM alerts
          WHERE status = 'open'
          GROUP BY school_id
        ) oa ON oa.school_id = s.id
        LEFT JOIN (
          SELECT school_id, COUNT(*)::int AS total
          FROM schedule_change_requests
          WHERE status = 'pending'
          GROUP BY school_id
        ) pr ON pr.school_id = s.id
        LEFT JOIN (
          SELECT school_id, COUNT(*)::int AS total
          FROM alerts
          WHERE type = 'playback_error'
            AND created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY school_id
        ) pf ON pf.school_id = s.id
        WHERE s.active = TRUE
        GROUP BY s.id, s.name, oa.total, pr.total, pf.total
        ORDER BY s.name ASC
        `
      );

      const openAlertsBySeverity = openAlerts.rows.reduce((acc, row) => {
        acc[row.severity] = Number(row.total) || 0;
        return acc;
      }, {});
      const openAlertsTotal = Object.values(openAlertsBySeverity).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );
      const schoolsStatus = schoolsStatusResult.rows.map((row) => ({
        schoolId: row.id,
        schoolName: row.name,
        hasSchedule: row.schedule_count > 0,
        scheduleCount: row.schedule_count,
        openAlerts: row.open_alerts,
        pendingApprovals: row.pending_requests,
        playbackFailuresLast24h: row.playback_failures_24h,
      }));

      const metricDate = new Date().toISOString().slice(0, 10);
      const metricsClient = await pool.connect();
      try {
        await metricsClient.query("BEGIN");
        await recordOperationalMetricSample(metricsClient, {
          metricDate,
          schoolId: null,
          dbLatencyMs,
          openAlerts: openAlertsTotal,
          playbackFailures: playbackFailures.rows[0]?.total || 0,
          pendingApprovals: pendingApprovals.rows[0]?.total || 0,
          schoolsWithoutSchedule: sweep.schoolsWithoutSchedule,
        });

        for (const schoolStatus of schoolsStatus) {
          await recordOperationalMetricSample(metricsClient, {
            metricDate,
            schoolId: schoolStatus.schoolId,
            dbLatencyMs,
            openAlerts: schoolStatus.openAlerts,
            playbackFailures: schoolStatus.playbackFailuresLast24h,
            pendingApprovals: schoolStatus.pendingApprovals,
            schoolsWithoutSchedule: schoolStatus.hasSchedule ? 0 : 1,
          });
        }
        await metricsClient.query("COMMIT");
      } catch (metricsError) {
        await metricsClient.query("ROLLBACK");
        console.error("Operational metrics snapshot error (global):", metricsError);
      } finally {
        metricsClient.release();
      }

      return res.json({
        apiOnline: true,
        scope: "global",
        checkedAt: sweep.checkedAt,
        checkedSchools: sweep.checkedSchools,
        schoolsWithoutSchedule: sweep.schoolsWithoutSchedule,
        activeSchools: schools.rows[0]?.total || 0,
        activeUsers: users.rows[0]?.total || 0,
        database: {
          status: "up",
          latencyMs: dbLatencyMs,
        },
        runtime: {
          startedAt: SERVER_STARTED_AT.toISOString(),
          uptimeSeconds,
          lastMonitoringSweepAt: runtimeStats.lastMonitoringSweepAt,
          lastDailyBackupSweepAt: runtimeStats.lastDailyBackupSweepAt,
          lastAuditRetentionSweepAt: runtimeStats.lastAuditRetentionSweepAt,
          lastMonitoringSweepResult: runtimeStats.lastMonitoringSweepResult,
          lastDailyBackupSweepResult: runtimeStats.lastDailyBackupSweepResult,
          lastAuditRetentionSweepResult: runtimeStats.lastAuditRetentionSweepResult,
          httpMetrics: getHttpMetricsSnapshot(),
        },
        openAlertsTotal,
        playbackFailuresLast24h: playbackFailures.rows[0]?.total || 0,
        pendingApprovals: pendingApprovals.rows[0]?.total || 0,
        schoolsStatus,
        openAlertsBySeverity,
      });
    }

    const schoolId = toIntId(req.user.schoolId);
    if (!schoolId) {
      return res.status(400).json({ error: "school_scope_not_found" });
    }

    const client = await pool.connect();
    try {
      const schoolResult = await client.query(
        `
        SELECT s.id, s.name, COUNT(sc.id)::int AS schedule_count
        FROM schools s
        LEFT JOIN schedules sc ON sc.school_id = s.id
        WHERE s.id = $1
          AND s.active = TRUE
        GROUP BY s.id, s.name
        LIMIT 1
        `,
        [schoolId]
      );

      if (!schoolResult.rowCount) {
        return res.status(404).json({ error: "school_not_found" });
      }

      const school = schoolResult.rows[0];
      const fingerprint = `school_without_schedule:${school.id}`;
      if (school.schedule_count === 0) {
        await upsertAlert(client, {
          type: "school_without_schedule",
          severity: "warning",
          schoolId: school.id,
          message: `Escola "${school.name}" sem horarios cadastrados.`,
          fingerprint,
          details: {
            monitorTrigger: "manual_scoped",
            checkedAt: new Date().toISOString(),
          },
        });
      } else {
        await resolveAlertByFingerprint(client, fingerprint, req.user.id);
      }

      const openAlerts = await client.query(
        `
        SELECT severity, COUNT(*)::int AS total
        FROM alerts
        WHERE status = 'open'
          AND school_id = $1
        GROUP BY severity
        `,
        [schoolId]
      );
      const pendingApprovals = await client.query(
        `
        SELECT COUNT(*)::int AS total
        FROM schedule_change_requests
        WHERE school_id = $1
          AND status = 'pending'
        `,
        [schoolId]
      );
      const playbackFailures = await client.query(
        `
        SELECT COUNT(*)::int AS total
        FROM alerts
        WHERE school_id = $1
          AND type = 'playback_error'
          AND created_at >= NOW() - INTERVAL '24 hours'
        `,
        [schoolId]
      );

      const openAlertsBySeverity = openAlerts.rows.reduce((acc, row) => {
        acc[row.severity] = Number(row.total) || 0;
        return acc;
      }, {});
      const openAlertsTotal = Object.values(openAlertsBySeverity).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );

      try {
        await recordOperationalMetricSample(client, {
          metricDate: new Date().toISOString().slice(0, 10),
          schoolId,
          dbLatencyMs,
          openAlerts: openAlertsTotal,
          playbackFailures: playbackFailures.rows[0]?.total || 0,
          pendingApprovals: pendingApprovals.rows[0]?.total || 0,
          schoolsWithoutSchedule: school.schedule_count === 0 ? 1 : 0,
        });
      } catch (metricsError) {
        console.error("Operational metrics snapshot error (school):", metricsError);
      }

      res.json({
        apiOnline: true,
        scope: "school",
        schoolId,
        checkedAt: new Date().toISOString(),
        checkedSchools: 1,
        schoolsWithoutSchedule: school.schedule_count === 0 ? 1 : 0,
        activeSchools: 1,
        database: {
          status: "up",
          latencyMs: dbLatencyMs,
        },
        runtime: {
          startedAt: SERVER_STARTED_AT.toISOString(),
          uptimeSeconds,
          lastMonitoringSweepAt: runtimeStats.lastMonitoringSweepAt,
          lastDailyBackupSweepAt: runtimeStats.lastDailyBackupSweepAt,
          lastAuditRetentionSweepAt: runtimeStats.lastAuditRetentionSweepAt,
          lastMonitoringSweepResult: runtimeStats.lastMonitoringSweepResult,
          lastDailyBackupSweepResult: runtimeStats.lastDailyBackupSweepResult,
          lastAuditRetentionSweepResult: runtimeStats.lastAuditRetentionSweepResult,
          httpMetrics: getHttpMetricsSnapshot(),
        },
        openAlertsTotal,
        playbackFailuresLast24h: playbackFailures.rows[0]?.total || 0,
        pendingApprovals: pendingApprovals.rows[0]?.total || 0,
        openAlertsBySeverity,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/monitor/status error:", error);
    sendInternalError(res, "failed_to_get_monitor_status", error);
  }
  }
);

app.get(
  "/api/monitor/history",
  authenticate,
  requirePermission("menus.dashboard"),
  requirePermission("features.dashboard_operational_history"),
  async (req, res) => {
    const daysRaw = Number.parseInt(String(req.query.days || "14"), 10);
    const days = Number.isInteger(daysRaw) ? Math.min(Math.max(daysRaw, 3), 90) : 14;
    const requestedSchoolId = req.query.schoolId ? toIntId(req.query.schoolId) : null;

    let targetSchoolId = null;
    if (req.user.role !== ROLE_SUPERADMIN) {
      targetSchoolId = toIntId(req.user.schoolId);
      if (!targetSchoolId) {
        return res.status(400).json({ error: "school_scope_not_found" });
      }
    } else if (requestedSchoolId) {
      targetSchoolId = requestedSchoolId;
      const school = await getSchoolById(pool, targetSchoolId);
      if (!school) return res.status(404).json({ error: "school_not_found" });
    }

    if (targetSchoolId && !canAccessSchool(req.user, targetSchoolId)) {
      return res.status(403).json({ error: "school_access_denied" });
    }

    try {
      const values = [days];
      const where = ["metric_date >= CURRENT_DATE - (($1::int) - 1) * INTERVAL '1 day'"];

      if (targetSchoolId) {
        values.push(targetSchoolId);
        where.push(`school_id = $${values.length}`);
      } else {
        where.push("school_id IS NULL");
      }

      const result = await pool.query(
        `
        SELECT metric_date, school_id, db_latency_avg_ms, db_latency_max_ms,
               open_alerts, playback_failures, pending_approvals, schools_without_schedule, samples, updated_at
        FROM operational_daily_metrics
        WHERE ${where.join(" AND ")}
        ORDER BY metric_date ASC
        `,
        values
      );

      return res.json({
        scope: targetSchoolId ? "school" : "global",
        schoolId: targetSchoolId,
        days,
        series: result.rows.map((row) => ({
          date: row.metric_date,
          schoolId: row.school_id,
          dbLatencyAvgMs:
            row.db_latency_avg_ms === null ? null : Number.parseFloat(row.db_latency_avg_ms),
          dbLatencyMaxMs:
            row.db_latency_max_ms === null ? null : Number.parseFloat(row.db_latency_max_ms),
          openAlerts: Number(row.open_alerts) || 0,
          playbackFailures: Number(row.playback_failures) || 0,
          pendingApprovals: Number(row.pending_approvals) || 0,
          schoolsWithoutSchedule: Number(row.schools_without_schedule) || 0,
          samples: Number(row.samples) || 0,
          updatedAt: row.updated_at,
        })),
      });
    } catch (error) {
      console.error("GET /api/monitor/history error:", error);
      return sendInternalError(res, "failed_to_get_monitor_history", error);
    }
  }
);

app.get(
  "/api/monitor/http-metrics",
  authenticate,
  requirePermission("menus.dashboard"),
  requirePermission("features.dashboard_http_metrics_view"),
  async (req, res) => {
    const canFilter = hasEffectivePermission(req.user, "features.dashboard_http_metrics_filters");
    const snapshot = getHttpMetricsSnapshot({
      topN: canFilter ? req.query.topN : 10,
      method: canFilter ? req.query.method : "ALL",
      windowMinutes: canFilter ? req.query.windowMinutes : 60,
    });
    const meta = getRequestMeta(req);
    await writeAuditLog({
      userId: req.user.id,
      schoolId: null,
      action: "view_http_metrics",
      resource: "monitor",
      resourceId: "http-metrics",
      afterData: {
        totalRequests: snapshot.totalRequests,
        totalErrors: snapshot.totalErrors,
        scope: snapshot.scope,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { requestId: meta.requestId },
    });

    return res.json({
      generatedAt: toIsoNow(),
      metrics: snapshot,
    });
  }
);

app.get("/api/public/schools/:identifier/player", async (req, res) => {
  try {
    const identifier = String(req.params.identifier || "").trim();
    if (!identifier) return res.status(400).json({ error: "invalid_public_link" });

    const schoolResult = await pool.query(
      `
      SELECT id, name, slug, timezone, active, public_token, created_at
      FROM schools
      WHERE (public_token = $1 OR slug = $1) AND active = TRUE
      LIMIT 1
      `,
      [identifier]
    );

    if (!schoolResult.rowCount) {
      return res.status(404).json({ error: "public_school_not_found" });
    }

    const school = schoolResult.rows[0];
    const schedule = await getScheduleObjectBySchoolId(pool, school.id);
    const audioTracksResult = await pool.query(
      `
      SELECT id, name, public_url, duration_seconds
      FROM audio_tracks
      WHERE active = TRUE
      ORDER BY name ASC
      `
    );

    return res.json({
      school: {
        id: String(school.id),
        name: school.name,
        slug: school.slug,
        timezone: school.timezone,
      },
      schedule,
      audioTracks: audioTracksResult.rows.map((track) => ({
        id: String(track.id),
        name: track.name,
        publicUrl: track.public_url,
        durationSeconds: track.duration_seconds,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/schools/:identifier/player error:", error);
    sendInternalError(res, "failed_to_load_public_player", error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "api_route_not_found" });
});

app.use(express.static(path.resolve(__dirname)));

app.get("/sinal/:schoolSlug/:token", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public-player.html"));
});

app.get("/sinal/:token", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "public-player.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

async function startServer() {
  await initializeApp({ serverless: false });
  app.listen(PORT, () => {
    console.log(`SinalTech API running on port ${PORT}`);
  });
}

let startupPromise = null;
let schedulerStarted = false;

async function initializeApp(options = {}) {
  const isServerless = options?.serverless === true;

  if (!startupPromise) {
    startupPromise = (async () => {
      await ensureEnterpriseSchema();
      await seedDefaultSuperAdmin();
    })();
  }

  await startupPromise;

  if (!isServerless) {
    await runMonitoringSweep("startup");
    await runDailyBackupSweep("daily");
    await runAuditRetentionSweep("startup");

    if (!schedulerStarted) {
      schedulerStarted = true;

      setInterval(() => {
        runMonitoringSweep("interval").catch((error) => {
          console.error("Monitoring sweep error:", error);
        });
      }, MONITOR_INTERVAL_MS).unref();

      setInterval(() => {
        runDailyBackupSweep("daily").catch((error) => {
          console.error("Daily backup sweep error:", error);
        });
      }, DAILY_BACKUP_INTERVAL_MS).unref();

      setInterval(() => {
        runAuditRetentionSweep("daily").catch((error) => {
          console.error("Audit retention sweep error:", error);
        });
      }, DAILY_BACKUP_INTERVAL_MS).unref();
    }
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = { app, initializeApp, pool, __testUtils: { normalizeSchedulePayload } };
