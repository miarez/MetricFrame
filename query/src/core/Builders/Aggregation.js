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

/**
 * first
 *
 * Value-level aggregator:
 *   - Factory: first("day")
 *   - Implicit-column form: first_day: first
 *
 * Difference vs dedupeBy:
 *   - first("day")   → returns the first VALUE of "day" per group
 *   - dedupeBy("k")  → returns the whole ROW per key
 */
export function first(colName) {
  return {
    __agg__: true,
    __name__: "first",
    __col__: colName || null,
    __impl__: Agg.first,
  };
}
markAgg("first", first);

/**
 * last
 *
 * Value-level aggregator:
 *   - Factory: last("day")
 *   - Implicit-column form: last_day: last
 *
 * Example:
 *   group("user_type").agg({
 *     first_day: first("day"),
 *     last_day:  last("day"),
 *   })
 *
 * Versus:
 *   dedupeBy("user_type", "day")  // keeps FULL ROW with min/max day
 */
export function last(colName) {
  return {
    __agg__: true,
    __name__: "last",
    __col__: colName || null,
    __impl__: Agg.last,
  };
}
markAgg("last", last);

/**
 * min
 */
export function min(colName) {
  return {
    __agg__: true,
    __name__: "min",
    __col__: colName || null,
    __impl__: Agg.min,
  };
}
markAgg("min", min);

/**
 * max
 */
export function max(colName) {
  return {
    __agg__: true,
    __name__: "max",
    __col__: colName || null,
    __impl__: Agg.max,
  };
}
markAgg("max", max);

/**
 * stddev (sample std dev)
 */
export function stddev(colName) {
  return {
    __agg__: true,
    __name__: "stddev",
    __col__: colName || null,
    __impl__: Agg.stddev,
  };
}
markAgg("stddev", stddev);

/**
 * var (sample variance)
 */
export function variance(colName) {
  return {
    __agg__: true,
    __name__: "var",
    __col__: colName || null,
    __impl__: Agg.var,
  };
}
markAgg("var", variance);

/**
 * median
 * (just quantile(0.5) with a nicer name)
 */
export function median(colName) {
  return {
    __agg__: true,
    __name__: "median",
    __col__: colName || null,
    __impl__: Agg.median,
  };
}
markAgg("median", median);
