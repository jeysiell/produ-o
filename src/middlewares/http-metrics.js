const crypto = require("crypto");

function createHttpMetricsMiddleware({ normalizeEndpointKey, recordHttpMetric, logStructured }) {
  return (req, res, next) => {
    const candidateRequestId = String(req.get("x-request-id") || "").trim();
    const requestId =
      candidateRequestId && candidateRequestId.length <= 120
        ? candidateRequestId
        : crypto.randomUUID();
    const startedAt = process.hrtime.bigint();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const endpointKey = normalizeEndpointKey(req);
      recordHttpMetric({
        endpoint: endpointKey,
        method: String(req.method || "UNKNOWN").toUpperCase(),
        statusCode: res.statusCode,
        durationMs,
        timestampMs: Date.now(),
      });

      const shouldLogRequest = Number(res.statusCode) >= 400 || durationMs >= 1000;
      if (shouldLogRequest) {
        logStructured(Number(res.statusCode) >= 500 ? "error" : "info", "http_request", {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        });
      }
    });

    next();
  };
}

module.exports = { createHttpMetricsMiddleware };
