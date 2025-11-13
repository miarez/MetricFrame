// src/io/json.js
import * as fs from "node:fs"; // ESM-friendly Node FS

// JSON IO + Utilities (Node + browser-friendly)
export class Json {
  // Parse JSON text into JS value (array/object/etc.)
  static parse(jsonString) {
    if (jsonString == null) return null;
    return JSON.parse(String(jsonString));
  }

  // Stringify JS value to JSON text
  // opts: { space?: number | string }
  static stringify(value, { space = 0 } = {}) {
    return JSON.stringify(value, null, space);
  }

  // Async read file as text (Node-only)
  static async readFile(path, encoding = "utf8") {
    if (typeof window === "undefined") {
      const buf = await fs.promises.readFile(path, encoding);
      return buf;
    } else {
      throw new Error("Json.readFile is Node-only in this build");
    }
  }

  // Async write value to file as JSON (Node-only)
  static async writeFile(path, value, opts = {}) {
    if (typeof window === "undefined") {
      const json = Json.stringify(value, opts);
      await fs.promises.writeFile(path, json, "utf8");
      return path;
    } else {
      throw new Error("Json.writeFile is Node-only in this build");
    }
  }

  // Sync read raw text (Node-only)
  static readFileSync(path, encoding = "utf8") {
    if (typeof window !== "undefined")
      throw new Error("Json.readFileSync is Node-only");
    return fs.readFileSync(path, encoding);
  }

  // Sync: read + parse JSON into JS value
  // For MetricFrame, you’ll typically expect an array of row objects.
  static readTableSync(path, opts = {}) {
    const text = Json.readFileSync(path, opts.encoding || "utf8");
    const value = Json.parse(text);
    return value;
  }
}
