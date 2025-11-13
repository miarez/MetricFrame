/**
 * COLUMN FUNCTIONS LAYER (Column.js)
 * ----------------------------------
 * ROLE: Row-wise / "calc" column functions.
 *
 * This file:
 *   - DOES NOT contain scalar math/text/date logic itself
 *   - DOES NOT operate on arrays, groups, or windows
 *   - DOES NOT perform aggregations (see Aggregation.js for that)
 *
 * Instead, it produces **wrapper objects** that tell MetricFrame:
 *   “When calculating a new column, pull values from these input columns,
 *    pass them into this scalar function, and assign the result to the row.”
 *
 * In other words:
 *   - These functions DO NOT produce values directly.
 *   - They DO NOT operate on entire Series (arrays).
 *   - They DO NOT aggregate or window.
 *
 * They ONLY return an object of the form:
 *
 *   {
 *      __columnfn__: (row) => ...,
 *      __columnmeta__: { name, args }
 *   }
 *
 * MetricFrame.calculate() later sees that wrapper and applies
 * __columnfn__(row) for every row in the dataset.
 *
 * Example usage in .calculate():
 *
 *   .calculate({
 *      margin: Column.sub("revenue", "profit"),
 *      month_short: Column.substr("month", 0, 3),
 *      today_col: Column.today()
 *   })
 *
 * This creates new columns using column-based resolution:
 *   - "revenue" → row["revenue"]
 *   - "profit"  → row["profit"]
 *   - scalar logic → applied row-by-row
 *
 * Aggregations:
 *   For group-level reductions like sum/mean/count, use Aggregation.js:
 *
 *   .groupBy("month").agg({
 *     total_revenue: sum("revenue"),
 *     profit:        mean,
 *   })
 *
 *   Those are column functions of type "agg" (column[] → scalar),
 *   but they live in a separate layer from these row-wise calc functions.
 */

import { Scalar } from "../Functions/Scalar.js";

export const Column = {};

// Dynamically generate wrappers for EVERY scalar function
// (static method) on Scalar, except internal helpers like toDate.
for (const name of Object.getOwnPropertyNames(Scalar)) {
  const fn = Scalar[name];

  // Only wrap real functions, skip non-functions and internal helpers
  if (typeof fn !== "function") continue;
  if (name === "toDate") continue;

  Column[name] = (...args) => ({
    __columnfn__: (row) => {
      // Convert string args into column lookups for this row.
      const resolved = args.map((a) =>
        typeof a === "string" && a in row ? row[a] : a
      );
      return fn(...resolved);
    },
    __columnmeta__: { name, args },
  });
}
/**
 * Logical combinators
 * -------------------
 * These let Column-based predicates be combined:
 *
 *    Column.all( Column.gt("x",0), Column.lt("y",10) )
 *
 * and used inside:
 *
 *    .filter( Column.all(...) )
 */

Column.all = (...predicates) => ({
  __columnfn__: (row) =>
    predicates.every((p) => (p?.__columnfn__ ? p.__columnfn__(row) : !!p(row))),
});

Column.any = (...predicates) => ({
  __columnfn__: (row) =>
    predicates.some((p) => (p?.__columnfn__ ? p.__columnfn__(row) : !!p(row))),
});

// Freeze namespace for safety.
Object.freeze(Column);
