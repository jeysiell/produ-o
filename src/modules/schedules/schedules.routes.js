function registerSchedulesRoutes(
  app,
  {
    pool,
    authenticate,
    requireAnyPermission,
    requireSchoolScope,
    requirePermission,
    requireWriteAccess,
    requireRoles,
    roleSuperadmin,
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
  }
) {
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
    requireRoles([roleSuperadmin]),
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
    requireRoles([roleSuperadmin]),
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
}

module.exports = { registerSchedulesRoutes };
