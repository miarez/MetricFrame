// utils/csv.js

export async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

// Simple but quote-aware CSV parser.
// Handles:
// - "a,b","c" → fields ["a,b", "c"]
// - a,b,c     → ["a", "b", "c"]
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] !== undefined ? cols[idx] : "";
    });
    rows.push(obj);
  }

  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Handle escaped double quote ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip second quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
