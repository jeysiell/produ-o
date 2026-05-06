function registerHealthRoutes(app, { pool }) {
  app.get("/api/health", async (_req, res) => {
    const start = Date.now();
    try {
      await pool.query("SELECT 1");
      const latencyMs = Date.now() - start;
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        database: {
          status: "up",
          latencyMs,
        },
      });
    } catch (error) {
      console.error("Health check error:", {
        code: error?.code,
        message: error?.message,
      });

      const payload = {
        ok: false,
        error: "database_unavailable",
        timestamp: new Date().toISOString(),
        database: {
          status: "down",
        },
      };
      if (process.env.NODE_ENV !== "production") {
        payload.detail = {
          code: error?.code || null,
          message: error?.message || null,
        };
      }

      res.status(500).json(payload);
    }
  });
}

module.exports = { registerHealthRoutes };
