function registerTemplatesRoutes(
  app,
  {
    pool,
    authenticate,
    requirePermission,
    requireWriteAccess,
    roleSuperadmin,
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
  }
) {
  app.get("/api/templates", authenticate, requirePermission("menus.config"), async (req, res) => {
    try {
      const requestedSchoolId = req.query.schoolId ? toIntId(req.query.schoolId) : null;
      const values = [];
      const where = [];

      if (req.user.role !== roleSuperadmin) {
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
        req.user.role === roleSuperadmin ? toIntId(req.body?.sourceSchoolId) : req.user.schoolId;

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
        req.user.role === roleSuperadmin ? requestedTargetSchoolId : req.user.schoolId;

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
          req.user.role !== roleSuperadmin &&
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
        if (req.user.role === roleSuperadmin) {
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
}

module.exports = { registerTemplatesRoutes };
