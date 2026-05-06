function createPermissionMiddlewares({
  writeRoles,
  hasEffectivePermission,
  toIntId,
  canAccessSchool,
}) {
  function requireRoles(allowedRoles) {
    return (req, res, next) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "insufficient_role" });
      }
      next();
    };
  }

  function requireWriteAccess(req, res, next) {
    if (!req.user || !writeRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "read_only_profile" });
    }
    next();
  }

  function requireNotInSimulation(req, res, next) {
    if (req.simulation?.active) {
      return res.status(403).json({ error: "simulation_read_only" });
    }
    next();
  }

  function requirePermission(permissionPath) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: "auth_required" });
      if (!hasEffectivePermission(req.user, permissionPath)) {
        return res.status(403).json({ error: "permission_denied", permission: permissionPath });
      }
      next();
    };
  }

  function requireAnyPermission(permissionPaths) {
    const allowedPaths = Array.isArray(permissionPaths) ? permissionPaths.filter(Boolean) : [];
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: "auth_required" });
      const hasAny = allowedPaths.some((permissionPath) =>
        hasEffectivePermission(req.user, permissionPath)
      );
      if (!hasAny) {
        return res.status(403).json({
          error: "permission_denied",
          permissionAnyOf: allowedPaths,
        });
      }
      next();
    };
  }

  function requireSchoolScope(options = {}) {
    const { paramName, bodyField, queryField } = options;

    return (req, res, next) => {
      let schoolId = null;

      if (paramName && req.params?.[paramName] !== undefined) {
        schoolId = toIntId(req.params[paramName]);
      } else if (bodyField && req.body?.[bodyField] !== undefined) {
        schoolId = toIntId(req.body[bodyField]);
      } else if (queryField && req.query?.[queryField] !== undefined) {
        schoolId = toIntId(req.query[queryField]);
      }

      if (!schoolId) {
        return res.status(400).json({ error: "invalid_school_id" });
      }

      req.targetSchoolId = schoolId;
      if (canAccessSchool(req.user, schoolId)) return next();
      return res.status(403).json({ error: "school_access_denied" });
    };
  }

  return {
    requireRoles,
    requireWriteAccess,
    requireNotInSimulation,
    requirePermission,
    requireAnyPermission,
    requireSchoolScope,
  };
}

module.exports = { createPermissionMiddlewares };
