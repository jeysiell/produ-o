const crypto = require("crypto");

function createAuthCookieService({ authCookieName, csrfCookieName, secure }) {
  function getAuthCookieOptions() {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    };
  }

  function getCsrfCookieOptions() {
    return {
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
    };
  }

  function issueAuthCookies(res, token) {
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie(authCookieName, token, getAuthCookieOptions());
    res.cookie(csrfCookieName, csrfToken, getCsrfCookieOptions());
    return csrfToken;
  }

  function clearAuthCookies(res) {
    res.clearCookie(authCookieName, getAuthCookieOptions());
    res.clearCookie(csrfCookieName, getCsrfCookieOptions());
  }

  return {
    issueAuthCookies,
    clearAuthCookies,
  };
}

module.exports = { createAuthCookieService };
