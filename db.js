const postgres = require("postgres");
const env = require("./src/config/env");

const sql = postgres(env.DATABASE_URL, {
  ssl: "require",
});

module.exports = sql;
