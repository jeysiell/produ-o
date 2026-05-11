function registerAuthUsersRoutes(app, deps) {
  const {
    pool,
    authenticate,
    requirePermission,
    requireRoles,
    roleSuperadmin,
    roleAdminEscola,
    assignableRoles,
    toIntId,
    normalizePermissionsPayload,
    normalizeUsername,
    isValidUsername,
    sanitizeUser,
    isStrongPassword,
    getPasswordPolicyDescription,
    isSchoolBoundRole,
    getSchoolById,
    bcrypt,
    getRequestMeta,
    writeAuditLog,
    sendInternalError,
  } = deps;

  app.get(
    "/api/auth/users",
    authenticate,
    requirePermission("menus.users"),
    requireRoles([roleSuperadmin, roleAdminEscola]),
    async (req, res) => {
      try {
        const values = [];
        const where = [];
        if (req.user.role !== roleSuperadmin) {
          values.push(req.user.schoolId);
          where.push(`u.school_id = $${values.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const result = await pool.query(
          `
          SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
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
    requireRoles([roleSuperadmin, roleAdminEscola]),
    async (req, res) => {
      const name = String(req.body?.name || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const username = normalizeUsername(req.body?.username);
      const password = String(req.body?.password || "");
      const role = String(req.body?.role || "").trim();
      const requestedSchoolId = req.body?.schoolId !== undefined ? toIntId(req.body.schoolId) : null;
      const requestedPermissions = normalizePermissionsPayload(req.body?.permissions);
      const active = req.body?.active === false ? false : true;

      if (!name || !email || !username || !password || !assignableRoles.includes(role)) {
        return res.status(400).json({ error: "invalid_user_payload" });
      }
      if (!isValidUsername(username)) {
        return res.status(400).json({ error: "invalid_username" });
      }
      if (!isStrongPassword(password)) {
        return res.status(400).json({ error: "weak_password", policy: getPasswordPolicyDescription() });
      }

      const isSuperAdmin = req.user.role === roleSuperadmin;
      let targetSchoolId = requestedSchoolId;

      if (!isSuperAdmin) {
        if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
        if (role === roleSuperadmin) return res.status(403).json({ error: "cannot_assign_superadmin_role" });
        if (requestedSchoolId && Number(requestedSchoolId) !== Number(req.user.schoolId)) {
          return res.status(403).json({ error: "school_access_denied" });
        }
        targetSchoolId = req.user.schoolId;
      } else if (role === roleSuperadmin) {
        targetSchoolId = null;
      }

      if (isSchoolBoundRole(role)) {
        if (!targetSchoolId) return res.status(400).json({ error: "school_id_required_for_non_superadmin" });
        const school = await getSchoolById(pool, targetSchoolId);
        if (!school) return res.status(404).json({ error: "school_not_found" });
        if (school.active === false) return res.status(400).json({ error: "school_inactive" });
      } else {
        targetSchoolId = null;
      }

      try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
          `
          INSERT INTO users (name, email, username, password_hash, role, school_id, permissions, active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id, name, email, username, role, school_id, permissions, active, created_at, updated_at
          `,
          [name, email, username, passwordHash, role, targetSchoolId, JSON.stringify(requestedPermissions), active]
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
        if (error?.code === "23505") return res.status(409).json({ error: "duplicate_user_identifier" });
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
    requireRoles([roleSuperadmin, roleAdminEscola]),
    async (req, res) => {
      const userId = toIntId(req.params.id);
      if (!userId) return res.status(400).json({ error: "invalid_user_id" });

      try {
        const beforeResult = await pool.query(
          `
          SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
                 s.name AS school_name
          FROM users u
          LEFT JOIN schools s ON s.id = u.school_id
          WHERE u.id = $1
          LIMIT 1
          `,
          [userId]
        );
        if (!beforeResult.rowCount) return res.status(404).json({ error: "user_not_found" });

        const before = beforeResult.rows[0];
        const isSuperAdmin = req.user.role === roleSuperadmin;
        if (!isSuperAdmin) {
          if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
          if (before.role === roleSuperadmin) return res.status(403).json({ error: "cannot_edit_superadmin" });
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
        if (Object.prototype.hasOwnProperty.call(req.body, "username")) {
          const username = normalizeUsername(req.body.username);
          if (!username) return res.status(400).json({ error: "username_cannot_be_empty" });
          if (!isValidUsername(username)) return res.status(400).json({ error: "invalid_username" });
          values.push(username);
          updates.push(`username = $${values.length}`);
        }

        let roleFromPayload = null;
        let schoolIdFromPayload = undefined;
        if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
          const role = String(req.body.role || "").trim();
          if (!assignableRoles.includes(role)) return res.status(400).json({ error: "invalid_role" });
          if (!isSuperAdmin && role === roleSuperadmin) {
            return res.status(403).json({ error: "cannot_assign_superadmin_role" });
          }
          roleFromPayload = role;
          values.push(role);
          updates.push(`role = $${values.length}`);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "schoolId")) {
          const schoolId = req.body.schoolId === null ? null : toIntId(req.body.schoolId);
          if (req.body.schoolId !== null && !schoolId) return res.status(400).json({ error: "invalid_school_id" });
          if (!isSuperAdmin && (!schoolId || Number(schoolId) !== Number(req.user.schoolId))) {
            return res.status(403).json({ error: "school_access_denied" });
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
          if (!isSuperAdmin) return res.status(403).json({ error: "password_reset_requires_superadmin" });
          const password = String(req.body.password || "");
          if (!isStrongPassword(password)) {
            return res.status(400).json({ error: "weak_password", policy: getPasswordPolicyDescription() });
          }
          values.push(await bcrypt.hash(password, 12));
          updates.push(`password_hash = $${values.length}`);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "permissions")) {
          const permissions = normalizePermissionsPayload(req.body.permissions);
          values.push(JSON.stringify(permissions));
          updates.push(`permissions = $${values.length}`);
        }
        if (!updates.length) return res.status(400).json({ error: "no_fields_to_update" });

        const nextRole = roleFromPayload || before.role;
        let nextSchoolId = schoolIdFromPayload !== undefined ? schoolIdFromPayload : before.school_id || null;
        if (nextRole === roleSuperadmin) {
          if (!isSuperAdmin) return res.status(403).json({ error: "cannot_assign_superadmin_role" });
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
          if (!school) return res.status(404).json({ error: "school_not_found" });
          if (school.active === false) return res.status(400).json({ error: "school_inactive" });
        }

        values.push(userId);
        updates.push("updated_at = NOW()");
        const updateResult = await pool.query(
          `
          UPDATE users
          SET ${updates.join(", ")}
          WHERE id = $${values.length}
          RETURNING id, name, email, username, role, school_id, permissions, active, created_at, updated_at
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
        if (error?.code === "23505") return res.status(409).json({ error: "duplicate_user_identifier" });
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
    requireRoles([roleSuperadmin]),
    async (req, res) => {
      const userId = toIntId(req.params.id);
      const newPassword = String(req.body?.newPassword || "");
      if (!userId) return res.status(400).json({ error: "invalid_user_id" });
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: "weak_password", policy: getPasswordPolicyDescription() });
      }
      try {
        const beforeResult = await pool.query(
          `
          SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
                 s.name AS school_name
          FROM users u
          LEFT JOIN schools s ON s.id = u.school_id
          WHERE u.id = $1
          LIMIT 1
          `,
          [userId]
        );
        if (!beforeResult.rowCount) return res.status(404).json({ error: "user_not_found" });
        const before = beforeResult.rows[0];
        await pool.query(
          `
          UPDATE users
          SET password_hash = $1,
              updated_at = NOW()
          WHERE id = $2
          `,
          [await bcrypt.hash(newPassword, 12), userId]
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
    requireRoles([roleSuperadmin, roleAdminEscola]),
    async (req, res) => {
      const userId = toIntId(req.params.id);
      if (!userId) return res.status(400).json({ error: "invalid_user_id" });
      try {
        const beforeResult = await pool.query(
          `
          SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
                 s.name AS school_name
          FROM users u
          LEFT JOIN schools s ON s.id = u.school_id
          WHERE u.id = $1
          LIMIT 1
          `,
          [userId]
        );
        if (!beforeResult.rowCount) return res.status(404).json({ error: "user_not_found" });
        const before = beforeResult.rows[0];
        if (Number(before.id) === Number(req.user.id)) {
          return res.status(400).json({ error: "cannot_deactivate_self" });
        }
        if (req.user.role !== roleSuperadmin) {
          if (!req.user.schoolId) return res.status(403).json({ error: "school_access_denied" });
          if (before.role === roleSuperadmin) {
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
          RETURNING id, name, email, username, role, school_id, permissions, active, created_at, updated_at
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
}

module.exports = { registerAuthUsersRoutes };
