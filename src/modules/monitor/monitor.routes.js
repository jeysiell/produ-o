function registerMonitorRoutes(app, deps) {
  const {
    pool,
    authenticate,
    requirePermission,
    requireAnyPermission,
    requireWriteAccess,
    roleSuperadmin,
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
    serverStartedAt,
    toIsoNow,
    sendInternalError,
  } = deps;

  app.get("/api/alerts", authenticate, requirePermission("menus.dashboard"), requireAnyPermission(["features.dashboard_open_alerts", "features.dashboard_monitor_alerts"]), async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : null;
      const schoolIdFilter = req.query.schoolId ? toIntId(req.query.schoolId) : null;
      const values = [];
      const where = [];
      if (status && ["open", "resolved"].includes(status)) {
        values.push(status);
        where.push(`a.status = $${values.length}`);
      }
      if (req.user.role !== roleSuperadmin) {
        if (!req.user.schoolId) return res.json([]);
        values.push(req.user.schoolId);
        where.push(`(a.school_id = $${values.length} OR a.school_id IS NULL)`);
      } else if (schoolIdFilter) {
        values.push(schoolIdFilter);
        where.push(`a.school_id = $${values.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const result = await pool.query(`SELECT a.id, a.type, a.severity, a.school_id, a.message, a.details, a.status, a.fingerprint, a.created_at, a.updated_at, a.resolved_at, a.resolved_by, s.name AS school_name, u.name AS resolved_by_name FROM alerts a LEFT JOIN schools s ON s.id = a.school_id LEFT JOIN users u ON u.id = a.resolved_by ${whereSql} ORDER BY a.created_at DESC LIMIT 500`, values);
      res.json(result.rows.map((row) => ({ id: row.id, type: row.type, severity: row.severity, schoolId: row.school_id, schoolName: row.school_name || null, message: row.message, details: row.details, status: row.status, fingerprint: row.fingerprint, createdAt: row.created_at, updatedAt: row.updated_at, resolvedAt: row.resolved_at, resolvedBy: row.resolved_by, resolvedByName: row.resolved_by_name || null })));
    } catch (error) {
      console.error("GET /api/alerts error:", error);
      sendInternalError(res, "failed_to_list_alerts", error);
    }
  });

  app.patch("/api/alerts/:id/resolve", authenticate, requireWriteAccess, async (req, res) => {
    const alertId = toIntId(req.params.id);
    if (!alertId) return res.status(400).json({ error: "invalid_alert_id" });
    try {
      const result = req.user.role === roleSuperadmin
        ? await pool.query(`UPDATE alerts SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, updated_at = NOW() WHERE id = $1 RETURNING id, school_id, type, status`, [alertId, req.user.id])
        : await pool.query(`UPDATE alerts SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, updated_at = NOW() WHERE id = $1 AND school_id = $3 RETURNING id, school_id, type, status`, [alertId, req.user.id, req.user.schoolId]);
      if (!result.rowCount) return res.status(404).json({ error: "alert_not_found_or_no_access" });
      const row = result.rows[0];
      const meta = getRequestMeta(req);
      await writeAuditLog({ userId: req.user.id, schoolId: row.school_id || null, action: "resolve_alert", resource: "alert", resourceId: String(row.id), afterData: row, ip: meta.ip, userAgent: meta.userAgent });
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
    if (!canAccessSchool(req.user, schoolId)) return res.status(403).json({ error: "school_access_denied" });

    const fingerprint = `playback_error:${schoolId}:${slugify(message).slice(0, 120)}`;
    const client = await pool.connect();
    try {
      const alert = await upsertAlert(client, { type: "playback_error", severity: "warning", schoolId, message, fingerprint, details: { ...context, reportedAt: new Date().toISOString() } });
      const meta = getRequestMeta(req);
      await writeAuditLog({ userId: req.user.id, schoolId, action: "report_playback_error", resource: "alert", resourceId: String(alert.id), afterData: { message, context }, ip: meta.ip, userAgent: meta.userAgent }, client);
      res.status(201).json({ success: true, alert });
    } catch (error) {
      console.error("POST /api/monitor/playback-error error:", error);
      sendInternalError(res, "failed_to_report_playback_error", error);
    } finally {
      client.release();
    }
  });

  app.get("/api/monitor/status", authenticate, requirePermission("menus.dashboard"), requirePermission("features.dashboard_schools_without_schedule"), async (req, res) => {
    try {
      const dbStart = Date.now(); await pool.query("SELECT 1");
      const dbLatencyMs = Date.now() - dbStart;
      const uptimeSeconds = Math.max(0, Math.floor((Date.now() - serverStartedAt.getTime()) / 1000));
      const commonRuntime = { startedAt: serverStartedAt.toISOString(), uptimeSeconds, lastMonitoringSweepAt: runtimeStats.lastMonitoringSweepAt, lastDailyBackupSweepAt: runtimeStats.lastDailyBackupSweepAt, lastAuditRetentionSweepAt: runtimeStats.lastAuditRetentionSweepAt, lastMonitoringSweepResult: runtimeStats.lastMonitoringSweepResult, lastDailyBackupSweepResult: runtimeStats.lastDailyBackupSweepResult, lastAuditRetentionSweepResult: runtimeStats.lastAuditRetentionSweepResult, httpMetrics: getHttpMetricsSnapshot() };

      if (req.user.role === roleSuperadmin) {
        const sweep = await runMonitoringSweep("manual", req.user.id);
        const [openAlerts, schools, users, pendingApprovals, playbackFailures, schoolsStatusResult] = await Promise.all([
          pool.query(`SELECT severity, COUNT(*)::int AS total FROM alerts WHERE status = 'open' GROUP BY severity`),
          pool.query(`SELECT COUNT(*)::int AS total FROM schools WHERE active = TRUE`),
          pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE active = TRUE`),
          pool.query(`SELECT COUNT(*)::int AS total FROM schedule_change_requests WHERE status = 'pending'`),
          pool.query(`SELECT COUNT(*)::int AS total FROM alerts WHERE type = 'playback_error' AND created_at >= NOW() - INTERVAL '24 hours'`),
          pool.query(`SELECT s.id, s.name, COUNT(sc.id)::int AS schedule_count, COALESCE(oa.total, 0)::int AS open_alerts, COALESCE(pr.total, 0)::int AS pending_requests, COALESCE(pf.total, 0)::int AS playback_failures_24h FROM schools s LEFT JOIN schedules sc ON sc.school_id = s.id LEFT JOIN (SELECT school_id, COUNT(*)::int AS total FROM alerts WHERE status = 'open' GROUP BY school_id) oa ON oa.school_id = s.id LEFT JOIN (SELECT school_id, COUNT(*)::int AS total FROM schedule_change_requests WHERE status = 'pending' GROUP BY school_id) pr ON pr.school_id = s.id LEFT JOIN (SELECT school_id, COUNT(*)::int AS total FROM alerts WHERE type = 'playback_error' AND created_at >= NOW() - INTERVAL '24 hours' GROUP BY school_id) pf ON pf.school_id = s.id WHERE s.active = TRUE GROUP BY s.id, s.name, oa.total, pr.total, pf.total ORDER BY s.name ASC`),
        ]);
        const openAlertsBySeverity = openAlerts.rows.reduce((acc, row) => { acc[row.severity] = Number(row.total) || 0; return acc; }, {});
        const openAlertsTotal = Object.values(openAlertsBySeverity).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const schoolsStatus = schoolsStatusResult.rows.map((row) => ({ schoolId: row.id, schoolName: row.name, hasSchedule: row.schedule_count > 0, scheduleCount: row.schedule_count, openAlerts: row.open_alerts, pendingApprovals: row.pending_requests, playbackFailuresLast24h: row.playback_failures_24h }));
        const metricDate = new Date().toISOString().slice(0, 10);
        const metricsClient = await pool.connect();
        try {
          await metricsClient.query("BEGIN");
          await recordOperationalMetricSample(metricsClient, { metricDate, schoolId: null, dbLatencyMs, openAlerts: openAlertsTotal, playbackFailures: playbackFailures.rows[0]?.total || 0, pendingApprovals: pendingApprovals.rows[0]?.total || 0, schoolsWithoutSchedule: sweep.schoolsWithoutSchedule });
          for (const schoolStatus of schoolsStatus) {
            await recordOperationalMetricSample(metricsClient, { metricDate, schoolId: schoolStatus.schoolId, dbLatencyMs, openAlerts: schoolStatus.openAlerts, playbackFailures: schoolStatus.playbackFailuresLast24h, pendingApprovals: schoolStatus.pendingApprovals, schoolsWithoutSchedule: schoolStatus.hasSchedule ? 0 : 1 });
          }
          await metricsClient.query("COMMIT");
        } catch (metricsError) {
          await metricsClient.query("ROLLBACK");
          console.error("Operational metrics snapshot error (global):", metricsError);
        } finally { metricsClient.release(); }
        return res.json({ apiOnline: true, scope: "global", checkedAt: sweep.checkedAt, checkedSchools: sweep.checkedSchools, schoolsWithoutSchedule: sweep.schoolsWithoutSchedule, activeSchools: schools.rows[0]?.total || 0, activeUsers: users.rows[0]?.total || 0, database: { status: "up", latencyMs: dbLatencyMs }, runtime: commonRuntime, openAlertsTotal, playbackFailuresLast24h: playbackFailures.rows[0]?.total || 0, pendingApprovals: pendingApprovals.rows[0]?.total || 0, schoolsStatus, openAlertsBySeverity });
      }

      const schoolId = toIntId(req.user.schoolId);
      if (!schoolId) return res.status(400).json({ error: "school_scope_not_found" });
      const client = await pool.connect();
      try {
        const schoolResult = await client.query(`SELECT s.id, s.name, COUNT(sc.id)::int AS schedule_count FROM schools s LEFT JOIN schedules sc ON sc.school_id = s.id WHERE s.id = $1 AND s.active = TRUE GROUP BY s.id, s.name LIMIT 1`, [schoolId]);
        if (!schoolResult.rowCount) return res.status(404).json({ error: "school_not_found" });
        const school = schoolResult.rows[0];
        const fingerprint = `school_without_schedule:${school.id}`;
        if (school.schedule_count === 0) await upsertAlert(client, { type: "school_without_schedule", severity: "warning", schoolId: school.id, message: `Escola "${school.name}" sem horarios cadastrados.`, fingerprint, details: { monitorTrigger: "manual_scoped", checkedAt: new Date().toISOString() } });
        else await resolveAlertByFingerprint(client, fingerprint, req.user.id);
        const [openAlerts, pendingApprovals, playbackFailures] = await Promise.all([
          client.query(`SELECT severity, COUNT(*)::int AS total FROM alerts WHERE status = 'open' AND school_id = $1 GROUP BY severity`, [schoolId]),
          client.query(`SELECT COUNT(*)::int AS total FROM schedule_change_requests WHERE school_id = $1 AND status = 'pending'`, [schoolId]),
          client.query(`SELECT COUNT(*)::int AS total FROM alerts WHERE school_id = $1 AND type = 'playback_error' AND created_at >= NOW() - INTERVAL '24 hours'`, [schoolId]),
        ]);
        const openAlertsBySeverity = openAlerts.rows.reduce((acc, row) => { acc[row.severity] = Number(row.total) || 0; return acc; }, {});
        const openAlertsTotal = Object.values(openAlertsBySeverity).reduce((sum, v) => sum + (Number(v) || 0), 0);
        try {
          await recordOperationalMetricSample(client, { metricDate: new Date().toISOString().slice(0, 10), schoolId, dbLatencyMs, openAlerts: openAlertsTotal, playbackFailures: playbackFailures.rows[0]?.total || 0, pendingApprovals: pendingApprovals.rows[0]?.total || 0, schoolsWithoutSchedule: school.schedule_count === 0 ? 1 : 0 });
        } catch (metricsError) { console.error("Operational metrics snapshot error (school):", metricsError); }
        return res.json({ apiOnline: true, scope: "school", schoolId, checkedAt: new Date().toISOString(), checkedSchools: 1, schoolsWithoutSchedule: school.schedule_count === 0 ? 1 : 0, activeSchools: 1, database: { status: "up", latencyMs: dbLatencyMs }, runtime: commonRuntime, openAlertsTotal, playbackFailuresLast24h: playbackFailures.rows[0]?.total || 0, pendingApprovals: pendingApprovals.rows[0]?.total || 0, openAlertsBySeverity });
      } finally { client.release(); }
    } catch (error) {
      console.error("GET /api/monitor/status error:", error);
      sendInternalError(res, "failed_to_get_monitor_status", error);
    }
  });

  app.get("/api/monitor/history", authenticate, requirePermission("menus.dashboard"), requirePermission("features.dashboard_operational_history"), async (req, res) => {
    const daysRaw = Number.parseInt(String(req.query.days || "14"), 10);
    const days = Number.isInteger(daysRaw) ? Math.min(Math.max(daysRaw, 3), 90) : 14;
    const requestedSchoolId = req.query.schoolId ? toIntId(req.query.schoolId) : null;
    let targetSchoolId = null;
    if (req.user.role !== roleSuperadmin) {
      targetSchoolId = toIntId(req.user.schoolId);
      if (!targetSchoolId) return res.status(400).json({ error: "school_scope_not_found" });
    } else if (requestedSchoolId) {
      targetSchoolId = requestedSchoolId;
      const school = await getSchoolById(pool, targetSchoolId);
      if (!school) return res.status(404).json({ error: "school_not_found" });
    }
    if (targetSchoolId && !canAccessSchool(req.user, targetSchoolId)) return res.status(403).json({ error: "school_access_denied" });
    try {
      const values = [days];
      const where = ["metric_date >= CURRENT_DATE - (($1::int) - 1) * INTERVAL '1 day'"];
      if (targetSchoolId) { values.push(targetSchoolId); where.push(`school_id = $${values.length}`); } else where.push("school_id IS NULL");
      const result = await pool.query(`SELECT metric_date, school_id, db_latency_avg_ms, db_latency_max_ms, open_alerts, playback_failures, pending_approvals, schools_without_schedule, samples, updated_at FROM operational_daily_metrics WHERE ${where.join(" AND ")} ORDER BY metric_date ASC`, values);
      return res.json({ scope: targetSchoolId ? "school" : "global", schoolId: targetSchoolId, days, series: result.rows.map((row) => ({ date: row.metric_date, schoolId: row.school_id, dbLatencyAvgMs: row.db_latency_avg_ms === null ? null : Number.parseFloat(row.db_latency_avg_ms), dbLatencyMaxMs: row.db_latency_max_ms === null ? null : Number.parseFloat(row.db_latency_max_ms), openAlerts: Number(row.open_alerts) || 0, playbackFailures: Number(row.playback_failures) || 0, pendingApprovals: Number(row.pending_approvals) || 0, schoolsWithoutSchedule: Number(row.schools_without_schedule) || 0, samples: Number(row.samples) || 0, updatedAt: row.updated_at })) });
    } catch (error) {
      console.error("GET /api/monitor/history error:", error);
      return sendInternalError(res, "failed_to_get_monitor_history", error);
    }
  });

  app.get("/api/monitor/http-metrics", authenticate, requirePermission("menus.dashboard"), requirePermission("features.dashboard_http_metrics_view"), async (req, res) => {
    const canFilter = hasEffectivePermission(req.user, "features.dashboard_http_metrics_filters");
    const snapshot = getHttpMetricsSnapshot({ topN: canFilter ? req.query.topN : 10, method: canFilter ? req.query.method : "ALL", windowMinutes: canFilter ? req.query.windowMinutes : 60 });
    const meta = getRequestMeta(req);
    await writeAuditLog({ userId: req.user.id, schoolId: null, action: "view_http_metrics", resource: "monitor", resourceId: "http-metrics", afterData: { totalRequests: snapshot.totalRequests, totalErrors: snapshot.totalErrors, scope: snapshot.scope }, ip: meta.ip, userAgent: meta.userAgent, meta: { requestId: meta.requestId } });
    return res.json({ generatedAt: toIsoNow(), metrics: snapshot });
  });
}

module.exports = { registerMonitorRoutes };
