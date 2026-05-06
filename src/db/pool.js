const dns = require("dns");
const { Pool } = require("pg");
const env = require("../config/env");

function createLookupWithFallback() {
  const resolver = new dns.promises.Resolver();
  if (env.DB_DNS_SERVERS.length > 0) {
    try {
      resolver.setServers(env.DB_DNS_SERVERS);
    } catch (_err) {
      // Ignore invalid custom DNS servers and keep defaults.
    }
  }

  return (hostname, options, callback) => {
    dns.lookup(hostname, options, async (nativeErr, address, family) => {
      if (!nativeErr) {
        callback(null, address, family);
        return;
      }

      const canFallback =
        env.DB_DNS_SERVERS.length > 0 &&
        ["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT", "ESERVFAIL"].includes(nativeErr.code);

      if (!canFallback) {
        callback(nativeErr);
        return;
      }

      const requestedFamily =
        typeof options === "number" ? options : Number(options?.family) || 0;

      try {
        if (requestedFamily === 4) {
          const ipv4 = await resolver.resolve4(hostname);
          if (ipv4?.length) return callback(null, ipv4[0], 4);
        } else if (requestedFamily === 6) {
          const ipv6 = await resolver.resolve6(hostname);
          if (ipv6?.length) return callback(null, ipv6[0], 6);
        } else {
          const ipv4 = await resolver.resolve4(hostname).catch(() => []);
          if (ipv4?.length) return callback(null, ipv4[0], 4);

          const ipv6 = await resolver.resolve6(hostname).catch(() => []);
          if (ipv6?.length) return callback(null, ipv6[0], 6);
        }

        callback(nativeErr);
      } catch (_fallbackErr) {
        callback(nativeErr);
      }
    });
  };
}

const shouldUseSsl = !/localhost|127\.0\.0\.1/.test(env.DATABASE_URL);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  lookup: createLookupWithFallback(),
});

module.exports = pool;
