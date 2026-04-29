process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/testdb";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { app, pool } = require("../server");

function buildToken(userId, extras = {}) {
  return jwt.sign(
    {
      sub: userId,
      ...extras,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function buildUserRow(overrides = {}) {
  return {
    id: overrides.id || 1,
    name: overrides.name || "Test User",
    email: overrides.email || "user@example.com",
    role: overrides.role || "admin_escola",
    school_id: overrides.school_id !== undefined ? overrides.school_id : 1,
    permissions: overrides.permissions || {},
    active: overrides.active !== false,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    school_name: overrides.school_name || "Escola Teste",
    school_active: overrides.school_active !== false,
    ...overrides,
  };
}

function installPoolMock(queryFn) {
  pool.query = jest.fn(queryFn);
  pool.connect = jest.fn(async () => ({
    query: pool.query,
    release: jest.fn(),
  }));
}

describe("API security and permission flows", () => {
  test("POST /api/auth/login returns token for valid credentials", async () => {
    const password = "SenhaForte@123";
    const hash = await bcrypt.hash(password, 12);

    installPoolMock(async (sql, params) => {
      const text = String(sql);
      if (text.includes("WHERE u.email = $1 AND u.active = TRUE")) {
        return {
          rowCount: 1,
          rows: [
            buildUserRow({
              id: 11,
              email: "admin@teste.com",
              role: "superadmin",
              school_id: null,
              school_name: null,
              password_hash: hash,
            }),
          ],
        };
      }
      if (text.includes("INSERT INTO audit_logs")) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query in login test: ${text.slice(0, 90)}`);
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@teste.com",
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe("admin@teste.com");
  });

  test("GET /api/auth/users denies user without users menu permission", async () => {
    installPoolMock(async (sql) => {
      const text = String(sql);
      if (text.includes("WHERE u.id = $1 AND u.active = TRUE")) {
        return {
          rowCount: 1,
          rows: [
            buildUserRow({
              id: 12,
              role: "somente_leitura",
              permissions: { menus: { users: false } },
            }),
          ],
        };
      }
      throw new Error(`Unexpected query in users permission test: ${text.slice(0, 90)}`);
    });

    const token = buildToken(12, { role: "somente_leitura", schoolId: 1 });
    const response = await request(app)
      .get("/api/auth/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("permission_denied");
  });

  test("POST /api/change-requests/:id/approve blocks admin without approval feature", async () => {
    installPoolMock(async (sql) => {
      const text = String(sql);
      if (text.includes("WHERE u.id = $1 AND u.active = TRUE")) {
        return {
          rowCount: 1,
          rows: [buildUserRow({ id: 13, role: "admin_escola", permissions: {} })],
        };
      }
      throw new Error(`Unexpected query in approve permission test: ${text.slice(0, 90)}`);
    });

    const token = buildToken(13, { role: "admin_escola", schoolId: 1 });
    const response = await request(app)
      .post("/api/change-requests/5/approve")
      .set("Authorization", `Bearer ${token}`)
      .send({ note: "teste" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("permission_denied");
  });

  test("POST /api/schools/:id/restore blocks read-only profile", async () => {
    installPoolMock(async (sql) => {
      const text = String(sql);
      if (text.includes("WHERE u.id = $1 AND u.active = TRUE")) {
        return {
          rowCount: 1,
          rows: [buildUserRow({ id: 14, role: "somente_leitura", permissions: {} })],
        };
      }
      throw new Error(`Unexpected query in restore permission test: ${text.slice(0, 90)}`);
    });

    const token = buildToken(14, { role: "somente_leitura", schoolId: 1 });
    const response = await request(app)
      .post("/api/schools/1/restore")
      .set("Authorization", `Bearer ${token}`)
      .send({ morning: [], afternoon: [], afternoonFriday: [] });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("permission_denied");
  });

  test("GET /api/monitor/status blocks access when dashboard menu is disabled", async () => {
    installPoolMock(async (sql) => {
      const text = String(sql);
      if (text.includes("WHERE u.id = $1 AND u.active = TRUE")) {
        return {
          rowCount: 1,
          rows: [
            buildUserRow({
              id: 15,
              role: "superadmin",
              school_id: null,
              school_name: null,
              permissions: { menus: { dashboard: false } },
            }),
          ],
        };
      }
      throw new Error(`Unexpected query in monitor permission test: ${text.slice(0, 90)}`);
    });

    const token = buildToken(15, { role: "superadmin", schoolId: null });
    const response = await request(app)
      .get("/api/monitor/status")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("permission_denied");
  });
});
