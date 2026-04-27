const { app, initializeApp } = require("../server");

module.exports = async (req, res) => {
  try {
    await initializeApp({ serverless: true });
    return app(req, res);
  } catch (error) {
    console.error("Vercel handler init error:", error);
    res.status(500).json({ error: "server_initialization_failed" });
  }
};
