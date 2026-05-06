const { initializeApp, app } = require("./app");
const env = require("./config/env");

async function startServer() {
  await initializeApp({ serverless: false });
  app.listen(env.PORT, () => {
    console.log(`SinalTech API running on port ${env.PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = { startServer };
