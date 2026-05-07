function registerAuthRoutes(app, deps) {
  const {
    pool,
    authenticate,
    requireRoles,
    requireNotInSimulation,
    roleSuperadmin,
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
    simulationTokenTtl,
    buildSimulationContext,
    sanitizeUser,
    isStrongPassword,
    getPasswordPolicyDescription,
    bcrypt,
    sendInternalError,
    logStructured,
    serializeError,
  } = deps;

  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const rateLimitKey = getLoginRateLimitKey(req, email);
    const rateLimitState = isLoginBlocked(rateLimitKey);
    const requestMeta = getRequestMeta(req);

    if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });
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
        if (!user.school_id) return res.status(403).json({ error: "user_school_not_configured" });
        if (user.school_active !== true) return res.status(403).json({ error: "school_inactive_or_not_found" });
      }

      const token = signAccessToken({ sub: user.id, role: user.role, schoolId: user.school_id || null });
      const csrfToken = issueAuthCookies(res, token);
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
      return res.json({ csrfToken, user: sanitizeUser(user) });
    } catch (error) {
      logStructured("error", "auth_login_failed", {
        requestId: req.requestId || null,
        email,
        error: serializeError(error),
      });
      return sendInternalError(res, "failed_to_login", error);
    }
  });

  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookies(res);
    res.json({ success: true });
  });

  app.post(
    "/api/auth/simulate/user/:id",
    authenticate,
    requireRoles([roleSuperadmin]),
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
        if (!targetResult.rowCount) return res.status(404).json({ error: "simulation_user_not_found" });
        const targetRow = targetResult.rows[0];
        if (isSchoolBoundRole(targetRow.role)) {
          if (!targetRow.school_id) return res.status(403).json({ error: "user_school_not_configured" });
          if (targetRow.school_active !== true) return res.status(403).json({ error: "school_inactive_or_not_found" });
        }

        const simulationToken = signAccessToken(
          { sub: req.user.id, simulation: true, simulatedUserId: targetRow.id },
          simulationTokenTtl
        );
        const csrfToken = issueAuthCookies(res, simulationToken);
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

        return res.json({ csrfToken, user: simulatedUser });
      } catch (error) {
        console.error("POST /api/auth/simulate/user/:id error:", error);
        return sendInternalError(res, "failed_to_start_user_simulation", error);
      }
    }
  );

  app.post("/api/auth/simulation/exit", authenticate, async (req, res) => {
    if (!req.simulation?.active || !req.actorUser?.id) {
      return res.status(400).json({ error: "simulation_not_active" });
    }

    const token = signAccessToken({
      sub: req.actorUser.id,
      role: req.actorUser.role,
      schoolId: req.actorUser.schoolId || null,
    });
    const csrfToken = issueAuthCookies(res, token);
    return res.json({ csrfToken, user: req.actorUser });
  });

  app.post("/api/auth/change-password", authenticate, async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "current_and_new_password_required" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: "weak_password", policy: getPasswordPolicyDescription() });
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
      if (!userResult.rowCount) return res.status(404).json({ error: "user_not_found" });

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
      if (samePassword) return res.status(400).json({ error: "new_password_must_be_different" });

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

      return res.json({ success: true });
    } catch (error) {
      console.error("POST /api/auth/change-password error:", error);
      return sendInternalError(res, "failed_to_change_password", error);
    }
  });
}

module.exports = { registerAuthRoutes };
