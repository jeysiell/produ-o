function createLoginRateLimiter({ windowMs, maxAttempts, blockMs }) {
  const state = new Map();

  function getLoginRateLimitKey(req, email) {
    const baseIp =
      String(req.headers["x-forwarded-for"] || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)[0] || req.socket?.remoteAddress || "unknown";
    const normalizedEmail = String(email || "").trim().toLowerCase() || "unknown";
    return `${baseIp}|${normalizedEmail}`;
  }

  function getRecord(key) {
    const now = Date.now();
    const existing = state.get(key);
    if (!existing || now - existing.windowStartedAt > windowMs) {
      const next = {
        windowStartedAt: now,
        attempts: 0,
        blockedUntil: 0,
      };
      state.set(key, next);
      return next;
    }
    return existing;
  }

  function isLoginBlocked(key) {
    const record = getRecord(key);
    const now = Date.now();
    if (record.blockedUntil > now) {
      return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - now) / 1000)),
      };
    }
    return { blocked: false, retryAfterSeconds: 0 };
  }

  function registerFailedLoginAttempt(key) {
    const record = getRecord(key);
    const now = Date.now();
    record.attempts += 1;
    if (record.attempts >= maxAttempts) {
      record.blockedUntil = now + blockMs;
    }
  }

  function clearLoginRateLimit(key) {
    state.delete(key);
  }

  return {
    getLoginRateLimitKey,
    isLoginBlocked,
    registerFailedLoginAttempt,
    clearLoginRateLimit,
  };
}

module.exports = { createLoginRateLimiter };
