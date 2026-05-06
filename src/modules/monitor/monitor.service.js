function createMonitorService(deps) {
  const {
    pool,
    runtimeStats,
    saveSchoolBackupSnapshot,
    toIntId,
    auditLogRetentionDays,
    toIsoNow,
    logStructured,
    serializeError,
  } = deps;

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
        metric_date, school_id, db_latency_avg_ms, db_latency_max_ms, open_alerts,
        playback_failures, pending_approvals, schools_without_schedule, samples, created_at, updated_at
      )
      VALUES ($1,$2,$3,$3,$4,$5,$6,$7,1,NOW(),NOW())
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
      [metricDate, schoolId, dbLatencyMs, openAlerts, playbackFailures, pendingApprovals, schoolsWithoutSchedule]
    );
  }

  async function upsertAlert(client, payload) {
    const result = await client.query(
      `
      INSERT INTO alerts (type, severity, school_id, message, details, status, fingerprint)
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
      SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, updated_at = NOW()
      WHERE fingerprint = $1 AND status = 'open'
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
            details: { monitorTrigger: trigger, checkedAt: new Date().toISOString() },
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

  async function runDailyBackupSweep(trigger = "daily", actorUserId = null) {
    const client = await pool.connect();
    try {
      const schools = await client.query(`SELECT id FROM schools WHERE active = TRUE ORDER BY id ASC`);
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
    const retentionDays = Math.max(7, auditLogRetentionDays);
    try {
      const result = await pool.query(
        `DELETE FROM audit_logs WHERE created_at < NOW() - ($1::int) * INTERVAL '1 day'`,
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

  return {
    recordOperationalMetricSample,
    upsertAlert,
    resolveAlertByFingerprint,
    runMonitoringSweep,
    runDailyBackupSweep,
    runAuditRetentionSweep,
  };
}

module.exports = { createMonitorService };
