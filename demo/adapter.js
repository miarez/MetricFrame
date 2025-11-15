export function adaptMetricFrameToTableInfo(df, mfInfo = {}) {
  // 0) Already table-shaped? Just use it.
  if (Array.isArray(mfInfo.columnIndex) && mfInfo.columnIndex.length) {
    return mfInfo;
  }

  const cols = Array.from(new Set(df.flatMap((row) => Object.keys(row || {}))));

  const measuresFromInfo = mfInfo.measures || [];
  const hasPipes = cols.some((c) => c.includes("|"));

  // ---------- NON-PIVOT CASE ----------
  if (!hasPipes) {
    // Decide which columns are measures
    const measures =
      measuresFromInfo.length > 0
        ? measuresFromInfo
        : cols.filter((c) => mfInfo.types?.[c] === "num");

    // Everything else is a row dimension
    const rowDims =
      mfInfo.rowDims && mfInfo.rowDims.length
        ? mfInfo.rowDims
        : cols.filter((c) => !measures.includes(c));

    // columnIndex only for measures (so dims don't repeat)
    const columnIndex = measures.map((key) => ({
      key,
      path: [key],
      dims: {},
      measure: key,
    }));

    return {
      ...mfInfo,
      rowDims,
      colDims: [],
      measures,
      columnIndex,
    };
  }

  // ---------- PIVOT CASE ----------
  const pivotSpec = mfInfo.pivotSpec || mfInfo.pivot || {};
  const rowsSpec = pivotSpec.rows || mfInfo.rowDims || [];
  const colsSpec = pivotSpec.columns || mfInfo.colDims || [];

  // Row dims are exactly what the user asked for in pivot.rows
  const rowDims = rowsSpec.length
    ? rowsSpec
    : cols.filter((c) => !c.includes("|"));

  // Column dims are exactly pivot.columns
  const colDims = colsSpec.length ? colsSpec : [];

  // Data columns = piped columns only
  const dataCols = cols.filter((c) => c.includes("|"));

  // Base measures inferred from piped keys unless provided
  const inferredMeasures = [...new Set(dataCols.map((k) => k.split("|")[0]))];
  const measures =
    measuresFromInfo.length > 0 ? measuresFromInfo : inferredMeasures;

  const columnIndex = dataCols.map((key) => {
    const parts = key.split("|");
    const measure = parts[0];
    const dimVals = parts.slice(1); // [user_type_value, is_churned_value]

    const dims = {};
    colDims.forEach((dimName, i) => {
      dims[dimName] = dimVals[i];
    });

    // HEADER STACK ORDER:
    //   user_type (top row)
    //   is_churned (second row)
    //   measure (bottom row)
    const path = [...dimVals, measure];

    return { key, path, dims, measure };
  });

  return {
    ...mfInfo,
    rowDims,
    colDims,
    measures,
    columnIndex,
  };
}
