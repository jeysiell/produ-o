function registerAuditRoutes(app, deps) {
  const {
    pool,
    authenticate,
    requirePermission,
    roleSuperadmin,
    toIntId,
    parseDateFilter,
    sendInternalError,
  } = deps;

  app.get(
    "/api/audit-logs",
    authenticate,
    requirePermission("menus.audit"),
    requirePermission("features.audit_view"),
    async (req, res) => {
      const limitRaw = Number.parseInt(String(req.query.limit || "100"), 10);
      const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
      const offsetRaw = Number.parseInt(String(req.query.offset || "0"), 10);
      const offset = Number.isInteger(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
      const schoolIdFilter = req.query.schoolId ? toIntId(req.query.schoolId) : null;
      const userIdFilter = req.query.userId ? toIntId(req.query.userId) : null;
      const fromFilter = req.query.from ? parseDateFilter(req.query.from) : null;
      const toFilter = req.query.to ? parseDateFilter(req.query.to, { endOfDay: true }) : null;
      const usesAuditFilters =
        offset > 0 ||
        Boolean(req.query.schoolId) ||
        Boolean(req.query.userId) ||
        Boolean(req.query.action) ||
        Boolean(req.query.from) ||
        Boolean(req.query.to);

      if (usesAuditFilters) {
        const effective = req.user?.effectivePermissions;
        if (!effective?.features?.audit_filters) {
          return res.status(403).json({
            error: "permission_denied",
            permission: "features.audit_filters",
          });
        }
      }

      if (req.query.from && !fromFilter) return res.status(400).json({ error: "invalid_from_date" });
      if (req.query.to && !toFilter) return res.status(400).json({ error: "invalid_to_date" });

      try {
        const values = [];
        const where = [];

        if (req.user.role !== roleSuperadmin) {
          if (!req.user.schoolId) {
            return res.json({ items: [], total: 0, limit, offset, hasMore: false });
          }
          values.push(req.user.schoolId);
          where.push(`al.school_id = $${values.length}`);
        } else if (schoolIdFilter) {
          values.push(schoolIdFilter);
          where.push(`al.school_id = $${values.length}`);
        }

        if (req.query.action) {
          values.push(String(req.query.action));
          where.push(`al.action = $${values.length}`);
        }
        if (userIdFilter) {
          values.push(userIdFilter);
          where.push(`al.user_id = $${values.length}`);
        }
        if (fromFilter) {
          values.push(fromFilter);
          where.push(`al.created_at >= $${values.length}`);
        }
        if (toFilter) {
          values.push(toFilter);
          where.push(`al.created_at <= $${values.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const countResult = await pool.query(
          `
          SELECT COUNT(*)::int AS total
          FROM audit_logs al
          ${whereSql}
          `,
          values
        );

        const pageValues = [...values, limit, offset];
        const result = await pool.query(
          `
          SELECT al.id, al.user_id, al.school_id, al.action, al.resource, al.resource_id,
                 al.before_data, al.after_data, al.meta, al.ip, al.user_agent, al.created_at,
                 u.name AS user_name, s.name AS school_name
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.user_id
          LEFT JOIN schools s ON s.id = al.school_id
          ${whereSql}
          ORDER BY al.created_at DESC
          LIMIT $${pageValues.length - 1}
          OFFSET $${pageValues.length}
          `,
          pageValues
        );

        const total = Number(countResult.rows[0]?.total) || 0;
        const items = result.rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name || null,
            schoolId: row.school_id,
            schoolName: row.school_name || null,
            action: row.action,
            resource: row.resource,
            resourceId: row.resource_id,
            beforeData: row.before_data,
            afterData: row.after_data,
            meta: row.meta,
            ip: row.ip,
            userAgent: row.user_agent,
            createdAt: row.created_at,
          }));

        res.json({
          items,
          total,
          limit,
          offset,
          hasMore: offset + items.length < total,
        });
      } catch (error) {
        console.error("GET /api/audit-logs error:", error);
        sendInternalError(res, "failed_to_list_audit_logs", error);
      }
    }
  );
}

module.exports = { registerAuditRoutes };
