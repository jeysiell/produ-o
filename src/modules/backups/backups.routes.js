function registerBackupsRoutes(
  app,
  {
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
    roleSuperadmin,
    sendInternalError,
  }
) {
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
    requirePermission("features.config_backup_refresh"),
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
    requirePermission("features.config_backup_preview"),
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
        if (req.user.role === roleSuperadmin) {
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
        if (req.user.role === roleSuperadmin) {
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
}

module.exports = { registerBackupsRoutes };
