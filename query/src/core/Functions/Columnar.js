// src/core/Functions/Columnar.js
// ------------------------------------------------------------
// COLUMNAR functions: vectorized wrappers over Scalar.
//
// These operate on *arrays* (columns) instead of scalars:
//   - Scalar.add(a, b)        -> number
//   - Columnar.add(colA, colB)-> number[]
//
// Broadcasting rules (simple version):
//   - If all array args have the same length N -> result length N
//   - Scalar args are treated as constants across all rows
//   - If multiple array args have different lengths (and >1), throw
// ------------------------------------------------------------

import { Scalar } from "./Scalar.js";

export class Columnar {}

// helper: determine common length & validate shapes
function resolveLength(args) {
  let len = 0;
  for (const a of args) {
    if (Array.isArray(a)) {
      if (len === 0) len = a.length;
      else if (a.length !== len)
        throw new Error(
          `Columnar: mismatched column lengths (${a.length} vs ${len})`
        );
    }
  }
  return len;
}

// Dynamically generate columnar wrappers for every Scalar static method
for (const name of Object.getOwnPropertyNames(Scalar)) {
  const fn = Scalar[name];

  // Only wrap real functions, skip non-functions and internal helpers
  if (typeof fn !== "function") continue;
  if (name === "toDate") continue;

  /**
   * Columnar[name](...args)
   *
   * Each arg can be:
   *   - an array  -> treated as a column
   *   - a scalar  -> broadcast to all rows
   *
   * Returns: array of results, one per "row".
   *
   * Example:
   *   Columnar.concat(["meow","woof"], ["cat","dog"])
   *   -> ["meowcat","woofdog"]
   */
  Columnar[name] = (...args) => {
    const len = resolveLength(args);
    if (len === 0) return [];

    const out = new Array(len);
    for (let i = 0; i < len; i++) {
      const resolved = args.map((a) => (Array.isArray(a) ? a[i] : a));
      out[i] = fn(...resolved);
    }
    return out;
  };
}
