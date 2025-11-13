// src/core/Functions/Aggregation.js
// ------------------------------------------------------------
// Aggregation DESCRIPTORS (builders)
//
// These DO NOT compute anything directly.
// They simply create descriptors:
//
//   {
//     __agg__: true,
//     __name__: "sum",
//     __col__: "revenue",
//     __impl__: Agg.sum
//   }
//
// MetricFrame.agg() will later call descriptor.__impl__(vals, col, rows)
// ------------------------------------------------------------

import { Agg } from "../Functions/Aggregation.js";

function markAgg(name, fn) {
  fn.__agg__ = true;
  fn.__name__ = name;
  return fn;
}

/**
 * sum
 *  - Factory: sum("revenue")
 *  - Implicit-column form: profit: sum
 */
export function sum(colName) {
  return {
    __agg__: true,
    __name__: "sum",
    __col__: colName || null, // null = infer from output field
    __impl__: Agg.sum, // PURE reducer
  };
}
markAgg("sum", sum);

/**
 * mean
 */
export function mean(colName) {
  return {
    __agg__: true,
    __name__: "mean",
    __col__: colName || null,
    __impl__: Agg.mean,
  };
}
markAgg("mean", mean);

/**
 * count
 */
export function count(colName) {
  return {
    __agg__: true,
    __name__: "count",
    __col__: colName || null,
    __impl__: Agg.count,
  };
}
markAgg("count", count);

/**
 * quantile(p)
 *  - Factory returns a function that returns the descriptor
 *  - Allows explicit output key mapping:
 *        margin_med: quantile(0.5)("margin")
 */

export function quantile(p, colName) {
  return {
    __agg__: true,
    __name__: `q${p}`,
    __col__: colName ?? null, // null = "infer from output key"
    __impl__: (vals) => Agg.quantile(p, vals),
  };
}
