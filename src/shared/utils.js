function toIsoNow() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toIntId(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : text;
}

function parseDateFilter(value, options = {}) {
  const text = String(value || "").trim();
  if (!text) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  let parsed;
  if (isDateOnly) {
    parsed = new Date(`${text}T00:00:00.000Z`);
    if (options.endOfDay) {
      parsed = new Date(`${text}T23:59:59.999Z`);
    }
  } else {
    parsed = new Date(text);
  }

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

module.exports = { toIsoNow, slugify, toIntId, normalizeTime, parseDateFilter };
