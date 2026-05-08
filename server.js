const express = require("express");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("./src/config/env");
const pool = require("./src/db/pool");
const { createAuthMiddleware } = require("./src/middlewares/auth");
const { createHttpMetricsMiddleware } = require("./src/middlewares/http-metrics");
const { createPermissionMiddlewares } = require("./src/middlewares/permissions");
const {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  createCookieCsrfGuard,
  createSimulationWriteGuard,
} = require("./src/middlewares/simulation");
const { registerHealthRoutes } = require("./src/modules/health/health.routes");
const { registerPublicPlayerRoutes } = require("./src/modules/public-player/public-player.routes");
const { registerSchoolsRoutes } = require("./src/modules/schools/schools.routes");
const { registerSchedulesRoutes } = require("./src/modules/schedules/schedules.routes");
const { registerTemplatesRoutes } = require("./src/modules/templates/templates.routes");
const { registerAudioRoutes } = require("./src/modules/audio/audio.routes");
const { registerBackupsRoutes } = require("./src/modules/backups/backups.routes");
const { registerAuthRoutes } = require("./src/modules/auth/auth.routes");
const { registerAuthUsersRoutes } = require("./src/modules/auth-users/auth-users.routes");
const { registerAuditRoutes } = require("./src/modules/audit/audit.routes");
const { registerMonitorRoutes } = require("./src/modules/monitor/monitor.routes");
const { createMonitorService } = require("./src/modules/monitor/monitor.service");
const {
  ROLE_SUPERADMIN,
  ROLE_ADMIN_ESCOLA,
  ROLE_SOMENTE_LEITURA,
  ALL_ROLES,
  ASSIGNABLE_ROLES,
  WRITE_ROLES,
  PERIODS,
  PERMISSION_KEYS,
  ROLE_PERMISSION_DEFAULTS,
} = require("./src/shared/constants");
const { createPermissionHelpers } = require("./src/shared/permissions");
const { createAuthCookieService } = require("./src/shared/auth-session");
const { createHttpMetricsStore } = require("./src/shared/http-metrics");
const { createLoginRateLimiter } = require("./src/shared/login-rate-limit");
const { toIsoNow, slugify, toIntId, normalizeTime, parseDateFilter } = require("./src/shared/utils");

const app = express();
const PORT = env.PORT;
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
const MONITOR_INTERVAL_MS = env.MONITOR_INTERVAL_MS;
const DAILY_BACKUP_INTERVAL_MS = env.DAILY_BACKUP_INTERVAL_MS;
const AUDIT_LOG_RETENTION_DAYS = env.AUDIT_LOG_RETENTION_DAYS;
const DEFAULT_ADMIN_EMAIL = env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = env.DEFAULT_ADMIN_PASSWORD;
const DEFAULT_ADMIN_NAME = env.DEFAULT_ADMIN_NAME;
const SIMULATION_TOKEN_TTL = env.SIMULATION_TOKEN_TTL;
const SERVER_STARTED_AT = new Date();
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
const AUDIO_CLIP_DURATION_SECONDS = 20;
const AUDIO_UPLOAD_MAX_BYTES = env.AUDIO_UPLOAD_MAX_BYTES;
const AUDIO_STORAGE_SOFT_LIMIT_BYTES = env.AUDIO_STORAGE_SOFT_LIMIT_BYTES;
const COOKIE_SECURE = env.NODE_ENV === "production";

const runtimeStats = {
  lastMonitoringSweepAt: null,
  lastMonitoringSweepResult: null,
  lastDailyBackupSweepAt: null,
  lastDailyBackupSweepResult: null,
  lastAuditRetentionSweepAt: null,
  lastAuditRetentionSweepResult: null,
};
const PASSWORD_MIN_LENGTH = env.PASSWORD_MIN_LENGTH;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const {
  buildEmptyPermissions,
  normalizePermissionsPayload,
  getRoleDefaultPermissions,
  getEffectivePermissions,
  hasEffectivePermission,
} = createPermissionHelpers({
  permissionKeys: PERMISSION_KEYS,
  rolePermissionDefaults: ROLE_PERMISSION_DEFAULTS,
});

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

const { normalizeEndpointKey, recordHttpMetric, getHttpMetricsSnapshot } =
  createHttpMetricsStore({
    maxEvents: env.HTTP_METRICS_MAX_EVENTS,
    maxAgeMs: env.HTTP_METRICS_MAX_AGE_MS,
    toIsoNow,
  });

const {
  getLoginRateLimitKey,
  isLoginBlocked,
  registerFailedLoginAttempt,
  clearLoginRateLimit,
} = createLoginRateLimiter({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  maxAttempts: env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  blockMs: env.LOGIN_RATE_LIMIT_BLOCK_MS,
});

const { issueAuthCookies, clearAuthCookies } = createAuthCookieService({
  authCookieName: AUTH_COOKIE_NAME,
  csrfCookieName: CSRF_COOKIE_NAME,
  secure: COOKIE_SECURE,
});

function isStrongPassword(password) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN_LENGTH) return false;
  return PASSWORD_POLICY_REGEX.test(value);
}

function getPasswordPolicyDescription() {
  return `minimum_length_${PASSWORD_MIN_LENGTH}_with_uppercase_lowercase_number_and_symbol`;
}

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use(
  "/api",
  createHttpMetricsMiddleware({
    normalizeEndpointKey,
    recordHttpMetric,
    logStructured,
  })
);

app.use("/api", createCookieCsrfGuard());
app.use("/api", createSimulationWriteGuard({ jwt, jwtSecret: JWT_SECRET }));

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

const {
  recordOperationalMetricSample,
  upsertAlert,
  resolveAlertByFingerprint,
  runMonitoringSweep,
  runDailyBackupSweep,
  runAuditRetentionSweep,
} = createMonitorService({
  pool,
  runtimeStats,
  saveSchoolBackupSnapshot,
  toIntId,
  auditLogRetentionDays: AUDIT_LOG_RETENTION_DAYS,
  toIsoNow,
  logStructured,
  serializeError,
});

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

function normalizeStoredPermissionsForRole(role, permissions) {
  return getEffectivePermissions(role, normalizePermissionsPayload(permissions));
}

const authenticate = createAuthMiddleware({
  jwt,
  jwtSecret: JWT_SECRET,
  pool,
  toIntId,
  sanitizeUser,
  isSchoolBoundRole,
  roleSuperadmin: ROLE_SUPERADMIN,
  buildSimulationContext,
  sendInternalError,
});

const {
  requireRoles,
  requireWriteAccess,
  requireNotInSimulation,
  requirePermission,
  requireAnyPermission,
  requireSchoolScope,
} = createPermissionMiddlewares({
  writeRoles: WRITE_ROLES,
  hasEffectivePermission,
  toIntId,
  canAccessSchool,
});

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

    const usersWithPermissions = await client.query(`
      SELECT id, role, permissions
      FROM users
      ORDER BY id ASC
    `);

    for (const user of usersWithPermissions.rows) {
      const normalizedPermissions = normalizeStoredPermissionsForRole(user.role, user.permissions);
      if (JSON.stringify(user.permissions || {}) === JSON.stringify(normalizedPermissions)) {
        continue;
      }
      await client.query("UPDATE users SET permissions = $1 WHERE id = $2", [
        JSON.stringify(normalizedPermissions),
        user.id,
      ]);
    }

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
  console.log("Use DEFAULT_ADMIN_PASSWORD from the environment for the first login.");
  console.log("Change credentials after first login.");
}

registerHealthRoutes(app, { pool });

registerAuthRoutes(app, {
  pool,
  authenticate,
  requireRoles,
  requirePermission,
  requireNotInSimulation,
  roleSuperadmin: ROLE_SUPERADMIN,
  toIntId,
  getLoginRateLimitKey,
  isLoginBlocked,
  registerFailedLoginAttempt,
  clearLoginRateLimit,
  getRequestMeta,
  writeAuditLog,
  isSchoolBoundRole,
  signAccessToken,
  issueAuthCookies,
  clearAuthCookies,
  simulationTokenTtl: SIMULATION_TOKEN_TTL,
  buildSimulationContext,
  sanitizeUser,
  isStrongPassword,
  getPasswordPolicyDescription,
  bcrypt,
  sendInternalError,
  logStructured,
  serializeError,
});

registerAuthUsersRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  requireRoles,
  roleSuperadmin: ROLE_SUPERADMIN,
  roleAdminEscola: ROLE_ADMIN_ESCOLA,
  assignableRoles: ASSIGNABLE_ROLES,
  toIntId,
  normalizePermissionsPayload,
  sanitizeUser,
  isStrongPassword,
  getPasswordPolicyDescription,
  isSchoolBoundRole,
  getSchoolById,
  bcrypt,
  getRequestMeta,
  writeAuditLog,
  sendInternalError,
});

registerSchoolsRoutes(app, {
  pool,
  authenticate,
  requireRoles,
  requirePermission,
  roleSuperadmin: ROLE_SUPERADMIN,
  slugify,
  toIntId,
  mapSchool,
  getSchoolById,
  generateSchoolPublicToken,
  getRequestMeta,
  writeAuditLog,
  sendInternalError,
});

registerSchedulesRoutes(app, {
  pool,
  authenticate,
  requireAnyPermission,
  requireSchoolScope,
  requirePermission,
  requireWriteAccess,
  requireRoles,
  roleSuperadmin: ROLE_SUPERADMIN,
  toIntId,
  getSchoolById,
  getScheduleObjectBySchoolId,
  sendInternalError,
  normalizeSchedulePayload,
  canAutoApproveScheduleChanges,
  upsertPendingScheduleChangeRequest,
  getRequestMeta,
  writeAuditLog,
  summarizeSchedule,
  mapScheduleChangeRequest,
  createAutoApprovedScheduleChangeRequest,
  replaceSchoolSchedule,
});
registerTemplatesRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  requireWriteAccess,
  roleSuperadmin: ROLE_SUPERADMIN,
  toIntId,
  canAccessSchool,
  getSchoolById,
  getScheduleObjectBySchoolId,
  normalizeSchedulePayload,
  canAutoApproveScheduleChanges,
  upsertPendingScheduleChangeRequest,
  createAutoApprovedScheduleChangeRequest,
  replaceSchoolSchedule,
  getRequestMeta,
  writeAuditLog,
  summarizeSchedule,
  mapScheduleChangeRequest,
  sendInternalError,
});

registerAudioRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  requireWriteAccess,
  hasEffectivePermission,
  mapAudioTrack,
  sendInternalError,
  audioStorageSoftLimitBytes: AUDIO_STORAGE_SOFT_LIMIT_BYTES,
  audioUploadMaxBytes: AUDIO_UPLOAD_MAX_BYTES,
  audioClipDurationSeconds: AUDIO_CLIP_DURATION_SECONDS,
  toIntId,
  slugify,
  crypto,
  uploadAudioClipToSupabase,
  getSupabasePublicStorageUrl,
  getRequestMeta,
  writeAuditLog,
  deleteAudioClipFromSupabase,
});

registerBackupsRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  requireWriteAccess,
  requireSchoolScope,
  toIntId,
  getSchoolById,
  getScheduleObjectBySchoolId,
  mapSchool,
  saveSchoolBackupSnapshot,
  getRequestMeta,
  writeAuditLog,
  summarizeSchedule,
  normalizeSchedulePayload,
  canAutoApproveScheduleChanges,
  upsertPendingScheduleChangeRequest,
  mapScheduleChangeRequest,
  createAutoApprovedScheduleChangeRequest,
  replaceSchoolSchedule,
  roleSuperadmin: ROLE_SUPERADMIN,
  sendInternalError,
});

registerAuditRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  roleSuperadmin: ROLE_SUPERADMIN,
  toIntId,
  parseDateFilter,
  sendInternalError,
});

registerMonitorRoutes(app, {
  pool,
  authenticate,
  requirePermission,
  requireAnyPermission,
  requireWriteAccess,
  roleSuperadmin: ROLE_SUPERADMIN,
  toIntId,
  canAccessSchool,
  slugify,
  upsertAlert,
  resolveAlertByFingerprint,
  runMonitoringSweep,
  recordOperationalMetricSample,
  getSchoolById,
  getRequestMeta,
  writeAuditLog,
  getHttpMetricsSnapshot,
  hasEffectivePermission,
  runtimeStats,
  serverStartedAt: SERVER_STARTED_AT,
  toIsoNow,
  sendInternalError,
});

registerPublicPlayerRoutes(app, { pool, getScheduleObjectBySchoolId, sendInternalError });

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

module.exports = {
  app,
  initializeApp,
  pool,
  __testUtils: { normalizeSchedulePayload, normalizeStoredPermissionsForRole },
};



