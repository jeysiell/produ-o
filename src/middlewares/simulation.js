const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const AUTH_COOKIE_NAME = "sinaltech_auth";
const CSRF_COOKIE_NAME = "sinaltech_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

function getBearerToken(req) {
  const value = req.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

function parseCookies(req) {
  const header = String(req.headers?.cookie || "");
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_err) {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function getCookieValue(req, name) {
  return parseCookies(req)[name] || null;
}

function getAuthToken(req) {
  const bearerToken = getBearerToken(req);
  if (bearerToken) return { token: bearerToken, source: "bearer" };

  const cookieToken = getCookieValue(req, AUTH_COOKIE_NAME);
  if (cookieToken) return { token: cookieToken, source: "cookie" };

  return { token: null, source: null };
}

function createCookieCsrfGuard() {
  return (req, res, next) => {
    if (!WRITE_METHODS.has(String(req.method || "").toUpperCase())) return next();
    if (req.path === "/auth/login") return next();
    if (getBearerToken(req)) return next();
    if (!getCookieValue(req, AUTH_COOKIE_NAME)) return next();

    const csrfCookie = getCookieValue(req, CSRF_COOKIE_NAME);
    const csrfHeader = String(req.get(CSRF_HEADER_NAME) || "");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({ error: "csrf_token_required" });
    }

    return next();
  };
}

function createSimulationWriteGuard({ jwt, jwtSecret }) {
  return (req, res, next) => {
    if (!WRITE_METHODS.has(String(req.method || "").toUpperCase())) return next();
    if (req.path === "/auth/login") return next();
    if (req.path === "/auth/logout") return next();
    if (req.path === "/auth/simulation/exit") return next();

    const { token } = getAuthToken(req);
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

module.exports = {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCookieCsrfGuard,
  createSimulationWriteGuard,
  getAuthToken,
  getBearerToken,
};
