const postgres = require("postgres");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

const sql = postgres(connectionString, {
  ssl: "require",
});

module.exports = sql;
