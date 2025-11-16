// src/utils/loadData.js

// I/O: fetch + parse
export async function loadData(dataConfig) {
  console.log("LOADING DATA");
  if (!dataConfig) return [];

  if (dataConfig.type === "csv") {
    const text = await fetch(dataConfig.url).then((r) => r.text());
    return parseCsv(text, dataConfig.delimiter || ",");
  }

  if (dataConfig.type === "json") {
    const data = await fetch(dataConfig.url).then((r) => r.json());
    // Make sure JSON data is an array of rows
    return Array.isArray(data) ? data : [];
  }

  console.warn("Unknown dataConfig.type, returning []", dataConfig);
  return [];
}

// --- CSV parsing with basic coercion (optional; keep or simplify) ---

function parseCsv(text, delimiter = ",") {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

/**
 * Normalize data based on engine config:
 *  - detect numeric fields from engine.series (field, xField, yField, radiusField)
 *  - coerce stringy numbers ("12000") into real numbers (12000)
 *
 * This is where we fix your "revenue: '12000'" problem globally.
 */
// src/utils/normalizeDataForEngine.js

export function normalizeDataForEngine(raw, engine = {}) {
  const rows = Array.isArray(raw) ? raw : [];
  const axes = engine.axes || {};
  const series = Array.isArray(engine.series) ? engine.series : [];

  const numericFields = new Set();

  // 1) Any axis with type "value" → its field should be numeric
  const x = axes.x;
  if (x && x.type === "value" && x.field) {
    numericFields.add(x.field); // this will catch "angle" for polar
  }

  const yArray = Array.isArray(axes.y) ? axes.y : axes.y ? [axes.y] : [];
  yArray.forEach((axis) => {
    if (axis && axis.type === "value" && axis.field) {
      numericFields.add(axis.field);
    }
  });

  // 2) Series value fields (y) – same thing we did before
  series.forEach((s) => {
    if (s.field) numericFields.add(s.field);
    if (s.valueField) numericFields.add(s.valueField);
  });

  // 3) Coerce those fields from "123" → 123 where possible
  return rows.map((row) => {
    const out = { ...row };

    numericFields.forEach((field) => {
      const v = out[field];
      if (v == null) return;
      if (typeof v === "number") return;

      if (typeof v === "string") {
        const num = Number(v.replace(/,/g, ""));
        if (!Number.isNaN(num)) {
          out[field] = num;
        }
      }
    });

    return out;
  });
}
