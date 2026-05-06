const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getBearerToken(req) {
  const value = req.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

function createSimulationWriteGuard({ jwt, jwtSecret }) {
  return (req, res, next) => {
    if (!WRITE_METHODS.has(String(req.method || "").toUpperCase())) return next();
    if (req.path === "/auth/login") return next();

    const token = getBearerToken(req);
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded?.simulation === true) {
        return res.status(403).json({ error: "simulation_read_only" });
      }
    } catch (_err) {
      // Ignore invalid tokens here; auth middleware handles auth errors later.
    }
    return next();
  };
}

module.exports = { createSimulationWriteGuard, getBearerToken };
