const { getAuthToken, getBearerToken } = require("./simulation");

function createAuthMiddleware({
  jwt,
  jwtSecret,
  pool,
  toIntId,
  sanitizeUser,
  isSchoolBoundRole,
  roleSuperadmin,
  buildSimulationContext,
  sendInternalError,
}) {
  return async function authenticate(req, res, next) {
    const { token, source } = getAuthToken(req);
    if (!token) return res.status(401).json({ error: "auth_required" });
    req.authTokenSource = source;

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (_err) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const requesterUserId = toIntId(decoded?.sub);
    if (!requesterUserId) return res.status(401).json({ error: "invalid_token" });

    try {
      const baseUserResult = await pool.query(
        `
        SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
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
        if (baseUser.role !== roleSuperadmin) {
          return res.status(403).json({ error: "simulation_requires_superadmin" });
        }

        const simulatedUserId = toIntId(decoded?.simulatedUserId);
        if (simulatedUserId) {
          const simulatedResult = await pool.query(
            `
            SELECT u.id, u.name, u.email, u.username, u.role, u.school_id, u.permissions, u.active, u.created_at, u.updated_at,
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
  };
}

module.exports = { createAuthMiddleware, getBearerToken };
