function createHttpMetricsStore({ maxEvents, maxAgeMs, toIsoNow }) {
  const state = {
    totalRequests: 0,
    totalErrors: 0,
    byEndpoint: new Map(),
    recentEvents: [],
  };

  function normalizeEndpointKey(req) {
    const method = String(req.method || "").toUpperCase() || "UNKNOWN";
    const pathValue = String(req.path || req.originalUrl || "/");
    return `${method} ${pathValue}`;
  }

  function pruneEvents(nowMs = Date.now()) {
    const cutoff = nowMs - maxAgeMs;
    if (!state.recentEvents.length) return;
    state.recentEvents = state.recentEvents.filter((event) => event.timestampMs >= cutoff);
    if (state.recentEvents.length > maxEvents) {
      state.recentEvents = state.recentEvents.slice(-maxEvents);
    }
  }

  function recordHttpMetric(metric) {
    const endpointKey = String(metric?.endpoint || "UNKNOWN");
    const method = String(metric?.method || "UNKNOWN").toUpperCase();
    const durationMs = Number(metric?.durationMs) || 0;
    const statusCode = Number(metric?.statusCode) || 0;
    const timestampMs = Number(metric?.timestampMs) || Date.now();

    const previous = state.byEndpoint.get(endpointKey) || {
      method,
      count: 0,
      errors: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
      lastStatusCode: 0,
      lastSeenAt: null,
    };

    previous.count += 1;
    previous.totalLatencyMs += durationMs;
    previous.maxLatencyMs = Math.max(previous.maxLatencyMs, durationMs);
    previous.lastStatusCode = statusCode;
    previous.lastSeenAt = toIsoNow();
    if (statusCode >= 500) previous.errors += 1;

    state.byEndpoint.set(endpointKey, previous);
    state.totalRequests += 1;
    if (statusCode >= 500) state.totalErrors += 1;

    state.recentEvents.push({
      endpoint: endpointKey,
      method,
      statusCode,
      durationMs,
      timestampMs,
    });
    pruneEvents(timestampMs);
  }

  function getHttpMetricsSnapshot(options = {}) {
    const topNRaw = Number.parseInt(String(options.topN || "10"), 10);
    const topN = Number.isInteger(topNRaw) ? Math.min(Math.max(topNRaw, 1), 100) : 10;
    const methodInput = String(options.method || "ALL").trim().toUpperCase();
    const allowedMethods = new Set(["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"]);
    const method = allowedMethods.has(methodInput) ? methodInput : "ALL";
    const windowRaw = Number.parseInt(String(options.windowMinutes || "60"), 10);
    const windowMinutes = Number.isInteger(windowRaw)
      ? Math.min(Math.max(windowRaw, 5), 1440)
      : 60;

    const nowMs = Date.now();
    pruneEvents(nowMs);
    const cutoff = nowMs - windowMinutes * 60 * 1000;

    const filtered = state.recentEvents.filter((event) => {
      if (event.timestampMs < cutoff) return false;
      if (method !== "ALL" && event.method !== method) return false;
      return true;
    });

    const byEndpoint = new Map();
    filtered.forEach((event) => {
      const previous = byEndpoint.get(event.endpoint) || {
        endpoint: event.endpoint,
        method: event.method,
        requests: 0,
        errors: 0,
        totalLatencyMs: 0,
        latencyMaxMs: 0,
        lastStatusCode: 0,
        lastSeenAt: null,
      };
      previous.requests += 1;
      previous.totalLatencyMs += Number(event.durationMs) || 0;
      previous.latencyMaxMs = Math.max(previous.latencyMaxMs, Number(event.durationMs) || 0);
      previous.lastStatusCode = Number(event.statusCode) || 0;
      previous.lastSeenAt = new Date(event.timestampMs).toISOString();
      if (Number(event.statusCode) >= 500) previous.errors += 1;
      byEndpoint.set(event.endpoint, previous);
    });

    const endpoints = Array.from(byEndpoint.values()).map((item) => ({
      endpoint: item.endpoint,
      method: item.method,
      requests: item.requests,
      errors: item.errors,
      errorRate: item.requests > 0 ? Number((item.errors / item.requests).toFixed(4)) : 0,
      latencyAvgMs:
        item.requests > 0 ? Number((item.totalLatencyMs / item.requests).toFixed(2)) : 0,
      latencyMaxMs: Number(item.latencyMaxMs.toFixed(2)),
      lastStatusCode: item.lastStatusCode,
      lastSeenAt: item.lastSeenAt,
    }));

    endpoints.sort((a, b) => b.requests - a.requests);

    return {
      scope: { method, windowMinutes, topN },
      totalRequests: filtered.length,
      totalErrors: filtered.reduce(
        (sum, event) => sum + (Number(event.statusCode) >= 500 ? 1 : 0),
        0
      ),
      endpoints: endpoints.slice(0, topN),
    };
  }

  return {
    normalizeEndpointKey,
    recordHttpMetric,
    getHttpMetricsSnapshot,
  };
}

module.exports = { createHttpMetricsStore };
