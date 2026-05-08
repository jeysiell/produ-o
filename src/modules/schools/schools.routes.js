function registerSchoolsRoutes(
  app,
  {
    pool,
    authenticate,
    requireRoles,
    requirePermission,
    roleSuperadmin,
    slugify,
    toIntId,
    mapSchool,
    getSchoolById,
    generateSchoolPublicToken,
    getRequestMeta,
    writeAuditLog,
    sendInternalError,
  }
) {
  app.get("/api/schools", authenticate, async (req, res) => {
    try {
      if (req.user.role === roleSuperadmin) {
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

  app.post(
    "/api/schools",
    authenticate,
    requirePermission("menus.schools"),
    requirePermission("features.schools_create"),
    requireRoles([roleSuperadmin]),
    async (req, res) => {
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
    }
  );

  app.patch(
    "/api/schools/:id",
    authenticate,
    requirePermission("menus.schools"),
    requirePermission("features.schools_edit"),
    requireRoles([roleSuperadmin]),
    async (req, res) => {
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
    }
  );

  app.delete(
    "/api/schools/:id",
    authenticate,
    requirePermission("menus.schools"),
    requirePermission("features.schools_disable"),
    requireRoles([roleSuperadmin]),
    async (req, res) => {
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
    }
  );
}

module.exports = { registerSchoolsRoutes };
