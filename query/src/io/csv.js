import * as fs from "node:fs"; // ESM-friendly Node FS

// --- file: src/io/csv.js ---
// CSV IO + Utilities (Node + browser-friendly)
export class Csv {
  static splitLine(line, sep = ",") {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  }

  static detectDelimiter(sample) {
    const seps = [",", ";", "\t", "|"]; // basic heuristics
    const first = sample.split(/\r?\n/)[0] || sample;
    let best = ",",
      bestCount = 0;
    for (const s of seps) {
      const cnt = (first.match(new RegExp(`\\${s}`, "g")) || []).length;
      if (cnt > bestCount) {
        best = s;
        bestCount = cnt;
      }
    }
    return best;
  }

  static parse(csvString, { delimiter } = {}) {
    const sep = delimiter || Csv.detectDelimiter(csvString);
    const lines = csvString.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const header = Csv.splitLine(lines[0], sep).map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = Csv.splitLine(lines[i], sep);
      const row = {};
      for (let j = 0; j < header.length; j++)
        row[header[j]] = cells[j] !== undefined ? cells[j] : "";
      rows.push(row);
    }
    return rows;
  }

  static stringify(rows, { delimiter = "," } = {}) {
    if (!rows || !rows.length) return "";
    const cols = Object.keys(rows[0]);
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return /["\n,;\t|]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
    };
    const head = cols.join(delimiter);
    const body = rows
      .map((r) => cols.map((c) => esc(r[c])).join(delimiter))
      .join("\n");
    return head + "\n" + body;
  }

  static async readFile(path) {
    if (typeof window === "undefined") {
      const fs = await import("fs");
      return fs.readFileSync(path, "utf8");
    } else {
      throw new Error("Csv.readFile is Node-only in this build");
    }
  }

  static async writeFile(path, rows, opts = {}) {
    if (typeof window === "undefined") {
      const fs = await import("fs");
      const csv = Array.isArray(rows)
        ? Csv.stringify(rows, opts)
        : String(rows);
      fs.writeFileSync(path, csv, "utf8");
      return path;
    } else {
      throw new Error("Csv.writeFile is Node-only in this build");
    }
  }

  // ADD near other methods
  static readFileSync(path, encoding = "utf8") {
    if (typeof window !== "undefined")
      throw new Error("Csv.readFileSync is Node-only");
    return fs.readFileSync(path, encoding);
  }

  // OPTIONAL: parse directly from file (sync)
  static readTableSync(path, opts = {}) {
    const text = Csv.readFileSync(path, opts.encoding || "utf8");
    return Csv.parse(text, opts);
  }
}
