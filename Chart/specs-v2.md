# Chart Library Architecture – Specs v2

This document describes the current architecture of the chart library as implemented in `chart-lib-2`. It is meant as a working spec for future development (XY / Radial / Pie / Gauge / Map / Flow) and as a reference for how all the pieces fit together.

---

## 1. High-Level Concepts

### 1.1 Goals

- Provide a **clean, declarative API** for describing charts via a structured config or builder.
- Hide **amCharts 5** implementation details behind internal “engines” and per-chart files.
- Keep a **single entry point** (`createChart`) for all chart types.
- Make chart types composable and discoverable via **engineType + chartType** instead of bespoke code.
- Keep cross-cutting behavior (cursor, legend, scrollbars, theme, background) in **decorators**.

### 1.2 Core Abstractions

There are three major layers:

1. **Builder layer (project root `/builder`)**
   - Constructor-style API for demos and consumers.
   - Produces a normalized **engine config** (no amCharts primitives).
2. **Runtime core (`src/`)**
   - `createChart` entry point, engines (`XY`, `Radial`), registry, decorators, utils.
   - Responsible for wiring amCharts objects using the engine config.
3. **Chart type modules (`src/charts/**`)\*\*
   - Each chart type has a dedicated file (e.g. `column.js`, `radarHeatmap.js`).
   - They call an engine + decorators and return an object representing the created chart.

At runtime, the flow is:

```mermaid
flowchart LR
  DemoConfig[Demo config file] --> ChartBuilder[Builder: Chart / XY / etc.]
  ChartBuilder --> FinalConfig[Final config object]
  FinalConfig --> createChart[createChart(config)]
  createChart --> registry[resolveChartBuilder(engineType, chartType)]
  registry --> ChartModule[Specific chart module]
  ChartModule --> Engine[XY / Radial engine]
  Engine --> amCharts[amCharts 5 primitives]

```

⸻

2. Project Structure

2.1 Top-level Layout

At a high level (simplified):

```
project-root/
  builder/
    Axis.js
    Chart.js
    Cursor.js
    Legend.js
    Scrollbars.js
    Series.js
    Theme.js
    XY.js

  demo/
    config/
      column.js
      line.js
      area.js
      stackedColumn.js
      stackedArea.js
      combo.js
      stream.js
      waterfall.js
      dot.js
      heatmap.js
      scatter.js
      beeswarm.js
      radarLine.js
      radarArea.js
      radarColumn.js
      polarLine.js
      polarArea.js
      polarScatter.js
      radarHeatmap.js
      ... (others as added)
    data/
      category-columns.csv
      category-single-series.csv
      category-multi-series.csv
      heatmap.csv
      scatter.csv
      beeswarm.csv
      radar.csv
      polar.csv
      polar-scatter.csv
      radar-heatmap.csv
      ...
    main.js

  src/
    core/
      createChart.js
      registry.js

    engines/
      xyEngine.js
      radialEngine.js

    charts/
      xy/
        catSeries/
          _baseCatSeries.js
          column.js
          line.js
          area.js
          stackedColumn.js
          stackedArea.js
          combo.js
          dot.js
          stream.js
          waterfall.js
        catCat/
          heatmap.js
        seriesSeries/
          _baseSeriesSeries.js      (optional / partial)
          scatter.js
          beeswarm.js

      radial/
        circularSeries/
          _baseCircularSeries.js
          radar.js
          radarArea.js
          radarColumn.js
          polarLine.js
          polarArea.js
          polarScatter.js
          radarHeatmap.js

    decorators/
      withCursor.js
      withLegend.js
      withScrollbars.js

    utils/
      loadData.js
      normalizeDataForEngine.js
      applyChartBackground.js
      pp.js
```

(Some filenames may differ slightly, but this is the logical shape.)

⸻

3. Runtime Core (src/core)

3.1 createChart.js

Responsibilities:
• Accept a top-level config built by builder/Chart.js or manually.
• Load data via dataLoader (CSV, etc.) using utils/loadData.js.
• Normalize data for the target engine using normalizeDataForEngine (coerce numeric strings to numbers, etc.).
• Resolve the chart builder from the registry based on engine.engineType and engine.chartType.
• Call the chart builder with (root, configWithData) and return its result.

Shape:

```js
import { resolveChartBuilder } from "./registry.js";
import { loadData } from "../utils/loadData.js";
import { normalizeDataForEngine } from "../utils/normalizeDataForEngine.js";

export async function createChart(baseConfig) {
  const root = am5.Root.new(baseConfig.container);

  let data = [];
  if (baseConfig.dataLoader) {
    const raw = await loadData(baseConfig.dataLoader);
    data = normalizeDataForEngine(raw, baseConfig.engine);
  }

  const config = {
    ...baseConfig,
    data,
  };

  const { engine } = config;
  const builder = resolveChartBuilder(engine.engineType, engine.chartType);

  try {
    const result = builder(root, config);
    return { root, ...result };
  } catch (err) {
    if (!root.isDisposed()) root.dispose();
    throw err;
  }
}
```

Notes:
• The entry point and CDN loading remain unchanged from your initial setup.
• createChart doesn’t care about XY vs Radial vs Pie; it just uses engineType + chartType.

3.2 registry.js

The registry maps (engineType, chartType) to a specific chart module.

```
import { columnChart } from "../charts/xy/catSeries/column.js";
import { lineChart } from "../charts/xy/catSeries/line.js";
import { areaChart } from "../charts/xy/catSeries/area.js";
import { stackedColumnChart } from "../charts/xy/catSeries/stackedColumn.js";
import { stackedAreaChart } from "../charts/xy/catSeries/stackedArea.js";
import { comboChart } from "../charts/xy/catSeries/combo.js";
import { dotChart } from "../charts/xy/catSeries/dot.js";
import { streamChart } from "../charts/xy/catSeries/stream.js";
import { waterfallChart } from "../charts/xy/catSeries/waterfall.js";
import { heatmapChart } from "../charts/xy/catCat/heatmap.js";
import { scatterChart } from "../charts/xy/seriesSeries/scatter.js";
import { beeswarmChart } from "../charts/xy/seriesSeries/beeswarm.js";

import { radarChart } from "../charts/radial/circularSeries/radar.js";
import { radarAreaChart } from "../charts/radial/circularSeries/radarArea.js";
import { radarColumnChart } from "../charts/radial/circularSeries/radarColumn.js";
import { polarLineChart } from "../charts/radial/circularSeries/polarLine.js";
import { polarAreaChart } from "../charts/radial/circularSeries/polarArea.js";
import { polarScatterChart } from "../charts/radial/circularSeries/polarScatter.js";
import { radarHeatmapChart } from "../charts/radial/circularSeries/radarHeatmap.js";

const registry = {
xy: {
column: columnChart,
line: lineChart,
area: areaChart,
stackedcolumn: stackedColumnChart,
stackedarea: stackedAreaChart,
combo: comboChart,
dot: dotChart,
stream: streamChart,
waterfall: waterfallChart,
heatmap: heatmapChart,
scatter: scatterChart,
beeswarm: beeswarmChart,
},
radial: {
radar: radarChart,
radararea: radarAreaChart,
radarcolumn: radarColumnChart,
polarline: polarLineChart,
polararea: polarAreaChart,
polarscatter: polarScatterChart,
radarheatmap: radarHeatmapChart,
},
// future: pie, hierarchy, map, flow, etc.
};

export function resolveChartBuilder(engineType, chartType) {
const engineKey = (engineType || "").toLowerCase();
const typeKey = (chartType || "").toLowerCase();

const engineBucket = registry[engineKey];
if (!engineBucket) {
throw new Error(`Unknown engineType "${engineType}"`);
}

const chartBuilder = engineBucket[typeKey];
if (!chartBuilder) {
throw new Error(
`Unknown chartType "${chartType}" for engine "${engineType}"`
);
}

return chartBuilder;
}

export default registry;
```

⸻

4. Engines (src/engines)

Engines are responsible for creating the base chart container and encapsulating engine-level defaults. Chart modules then add axes, series, and decorators.

4.1 xyEngine.js

Responsible for:
• Creating am5xy.XYChart with panning/zoom defaults.
• Providing a base for all XY charts (catSeries, catCat, seriesSeries).

// src/engines/xyEngine.js

export function createXYChart(root, engine = {}) {
const chart = root.container.children.push(
am5xy.XYChart.new(root, {
panX: engine.panX ?? true,
panY: engine.panY ?? true,
wheelX: engine.wheelX ?? "panX",
wheelY: engine.wheelY ?? "zoomX",
pinchZoomX: engine.pinchZoomX ?? true,
pinchZoomY: engine.pinchZoomY ?? true,
})
);

return { chart };
}

Used by:
• XY catSeries (column, line, area, stackedColumn, stackedArea, combo, dot, stream, waterfall)
• XY catCat (heatmap)
• XY seriesSeries (scatter, beeswarm)

4.2 radialEngine.js

Responsible for:
• Creating am5radar.RadarChart with angular defaults.
• Handling startAngle, endAngle, innerRadius, etc.

// src/engines/radialEngine.js

export function createRadialChart(root, engine = {}) {
const radialCfg = engine.radial || {};

const chart = root.container.children.push(
am5radar.RadarChart.new(root, {
startAngle: engine.startAngle ?? radialCfg.startAngle ?? -90,
endAngle: engine.endAngle ?? radialCfg.endAngle ?? 270,
innerRadius: engine.innerRadius ?? radialCfg.innerRadius ?? 0,
panX: radialCfg.panX ?? false,
panY: radialCfg.panY ?? false,
wheelX: radialCfg.wheelX ?? "none",
wheelY: radialCfg.wheelY ?? "none",
})
);

return { chart };
}

Used by:
• radar, radarArea, radarColumn
• polarLine, polarArea, polarScatter
• radarHeatmap

⸻

5. Charts (src/charts/\*\*)

Each chart type file:
• Accepts (root, config).
• Reads config.engine and config.data.
• Builds axes, series, and chart-type-specific behavior.
• Applies decorators (legend, cursor, scrollbars, background).
• Returns an object with at least { chart, series, cleanup } (plus axes, legend, etc.).

5.1 XY – catSeries

5.1.1 \_baseCatSeries.js
Shared base for category × numeric series charts:
• Category X axis.
• One or more numeric Y axes.
• Series geoms: column, line, area, stackedColumn, stackedArea, combo, dot, stream, waterfall.

Responsibilities:
• Build CategoryAxis for X from engine.categoryField and axes.x.
• Build one or more ValueAxis for Y from axes.y.
• Loop over engine.series and create the correct LineSeries / ColumnSeries etc. per geom.
• Apply decorators: legend, cursor (when appropriate), scrollbars, background.

Chart files (column, line, area, etc.) are thin wrappers that set chartType or geoms and call this base.

5.1.2 Example: column.js

// src/charts/xy/catSeries/column.js
import { buildCatSeriesChart } from "./\_baseCatSeries.js";

export function columnChart(root, config) {
const engine = config.engine || {};

const patched = {
...config,
engine: {
...engine,
engineType: "XY",
chartType: "column",
},
};

return buildCatSeriesChart(root, patched);
}

Other catSeries charts follow the same pattern but modify chartType or geoms:
• line.js
• area.js
• stackedColumn.js
• stackedArea.js
• combo.js
• dot.js
• stream.js
• waterfall.js

5.2 XY – catCat (heatmap.js)

heatmap.js implements a Cartesian heatmap (Category × Category grid).

Key points:
• Uses createXYChart.
• CategoryAxis on X and Y.
• ColumnSeries with categoryXField, categoryYField, valueField.
• Columns fill 100% width/height of the cell.
• Uses heatRules to color tiles from yellow to red based on valueField.
• No XYCursor: cursor conflicts with tile hit-testing; tooltips are on columns.

Return object:

return {
chart,
xAxis,
yAxis,
series: [series],
cursor: null,
scrollbars,
cleanup,
};

5.3 XY – seriesSeries

5.3.1 scatter.js
Numeric X × numeric Y scatter:
• ValueAxis for X and Y.
• LineSeries with strokes hidden and bullets only.
• Tooltips show {xField}, {yField}.

5.3.2 beeswarm.js
Beeswarm (swarm plot):
• Uses XY engine but renders a 1D beeswarm along X with vertical jitter.
• Requires window.d3 to be loaded.
• LineSeries with bullets only.
• D3 forceSimulation + forceCollide to distribute points vertically.
• Auto-fit X domain to data; Y extent based on max radius.

Return object includes a cleanup that stops the simulation and disposes the root.

5.4 Radial – circularSeries

5.4.1 \_baseCircularSeries.js
Shared base for:
• radarLine, radarArea, radarColumn (categorical angle)
• polarLine, polarArea (numeric angle)
• polarScatter (dot geom)

Key logic:
• Determine mode:

const typeKey = (engine.chartType || "").toLowerCase();
const isPolar = typeKey.startsWith("polar") || xCfg.type === "value";

    •	For radar:
    •	CategoryAxis (AxisRendererCircular) for angle.
    •	ValueAxis (AxisRendererRadial) for radius.
    •	RadarLineSeries / RadarColumnSeries with categoryXField + valueYField.
    •	For polar:
    •	ValueAxis (AxisRendererCircular) for angle.
    •	Auto-fit angle axis min/max from data if not explicitly provided.
    •	RadarLineSeries with valueXField + valueYField.
    •	Geoms:
    •	line: strokes visible, no fill.
    •	area: strokes + fill (with opacity).
    •	column: RadarColumnSeries, columns with no stroke.
    •	dot: bullets only (for polarScatter).

5.4.2 Radar charts
Concrete files wrap \_baseCircularSeries and enforce chartType / default geoms:
• radar.js → chartType: "radar" (line).
• radarArea.js → chartType: "radarArea" (area geom).
• radarColumn.js → chartType: "radarColumn" (column geom).

5.4.3 Polar charts
• polarLine.js → chartType: "polarLine", value X axis, line geom.
• polarArea.js → chartType: "polarArea", area geom.
• polarScatter.js → chartType: "polarScatter", geom coerced to dot (bullets only).

5.5 Radial – radar heatmap

radarHeatmap.js implements a radial heatmap (Category × Category in polar coordinates).

Key points:
• Uses createRadialChart.
• CategoryAxis (circular) on angle (e.g. hour).
• CategoryAxis (radial) on radius (e.g. weekday).
• RadarColumnSeries as tiles with categoryXField, categoryYField, valueField.
• heatRules from yellow to red based on valueField.
• No cursor; scrollbars optional.

⸻

6. Decorators (src/decorators)

Decorators are shared composable behaviors that can be plugged into any chart type.

6.1 withLegend.js
• Attaches a legend when config.legend.enabled is true.
• Typically used like:

const legend = withLegend(root, chart, seriesArray, config.legend || {});

6.2 withCursor.js
• Adds XY cursor behavior (crosshair + tooltips).
• Not used for heatmaps (Cartesian or radial).
• For XY line/area/column/etc., it wires an XYCursor with axes and config options.

6.3 withScrollbars.js
• Adds scrollbars for X/Y axes when enabled.

const scrollbars = withScrollbars(root, chart, config.scrollbars || {});

⸻

7. Utilities (src/utils)

7.1 loadData.js
• Reads data based on dataLoader config.
• Currently supports CSV (type: "csv").
• Returns an array of row objects.

Example:

dataLoader: {
type: "csv",
url: "./data/category-columns.csv",
delimiter: ",",
}

7.2 normalizeDataForEngine.js
• Takes raw data and an engine config.
• Determines which fields are numeric based on:
• Any axis with type: "value" and a field.
• Any series with field / valueField.
• Coerces numeric-looking strings to numbers.

export function normalizeDataForEngine(raw, engine = {}) {
const rows = Array.isArray(raw) ? raw : [];
const axes = engine.axes || {};
const series = Array.isArray(engine.series) ? engine.series : [];

const numericFields = new Set();

const x = axes.x;
if (x && x.type === "value" && x.field) {
numericFields.add(x.field);
}

const yArray = Array.isArray(axes.y) ? axes.y : axes.y ? [axes.y] : [];
yArray.forEach((axis) => {
if (axis && axis.type === "value" && axis.field) {
numericFields.add(axis.field);
}
});

series.forEach((s) => {
if (s.field) numericFields.add(s.field);
if (s.valueField) numericFields.add(s.valueField);
});

return rows.map((row) => {
const out = { ...row };
numericFields.forEach((field) => {
const v = out[field];
if (v == null || typeof v === "number") return;
if (typeof v === "string") {
const num = Number(v.replace(/,/g, ""));
if (!Number.isNaN(num)) out[field] = num;
}
});
return out;
});
}

Critical for:
• Stream offsets and waterfall math.
• Scatter, polar, beeswarm.
• General numeric correctness.

7.3 applyChartBackground.js
• Sets chart background color based on config.theme.background.

if (config.theme && config.theme.background) {
applyChartBackground(root, chart, config.theme.background);
}

7.4 pp.js (debug helper)

Debug utilities that only log when a global debug flag is true.

export let DEBUG = false;

export function debug() {
DEBUG = true;
}

export class pp {
static log(...args) {
if (!DEBUG) return;
console.log(...args);
}

static deep(val) {
if (!DEBUG) return;
console.dir(val, { depth: null });
}

static hr(label) {
if (!DEBUG) return;
console.log("------", label || "------");
}
}

Usage:

import { debug, pp } from "../utils/pp.js";

debug(); // enable debugging
pp.log("Loaded rows:", data.length);
pp.deep(config.data[0]);

⸻

8. Builder Layer (/builder)

Builders are developer-facing helpers that construct the final config object fed into createChart. You can always build configs manually, but builders:
• Provide defaults (axes, theme, legend, cursor, scrollbars).
• Encapsulate validation.
• Infer chartType from series geoms and stacking.

8.1 Chart.js

Top-level chart builder.

Responsibilities:
• htmlContainer / container (DOM ID).
• dataLoader config.
• Engine config from XY / Radial builder.
• High-level elements: theme, legend, cursor, scrollbars with sensible defaults.

Usage:

import { Chart } from "../../builder/Chart.js";
import { XY } from "../../builder/XY.js";
import { Series } from "../../builder/Series.js";

const chartConfig = new Chart()
.htmlContainer("chartdiv")
.dataLoader({
type: "csv",
url: "./data/category-columns.csv",
delimiter: ",",
})
.engine(
new XY()
.category("month")
.addSeries(new Series("revenue").geom("column"))
.build()
)
.build();

export default chartConfig;

Output shape:

{
container: "chartdiv",
dataLoader: { ... },
engine: { ... }, // from XY / Radial builders
theme: { ... },
legend: { ... },
cursor: { ... },
scrollbars: { ... },
}

8.2 XY.js

Builder for XY engine configs (catSeries, seriesSeries, catCat when needed).

Stores:
• \_categoryField
• \_explicitChartType
• \_xAxis builder
• \_yAxes builder array
• \_seriesBuilders array

build():
• Ensures default X and Y axes when none supplied.
• Builds axis configs from axis builders (CategoryAxis, ValueAxis, etc.).
• Builds series from Series builders.
• Validates stacking per axis (no mixed geoms on a stacked axis).
• Infers chartType when not explicitly set based on geoms and stacking.

Example:

const engine = new XY()
.category("month")
.addSeries(new Series("revenue").geom("column"))
.build();

// engine:
{
engineType: "XY",
chartType: "column",
categoryField: "month",
axes: {
x: { id: "x", type: "category", position: "bottom", ... },
y: [
{ id: "y", type: "value", position: "left", ... }
]
},
series: [
{
field: "revenue",
name: "Revenue",
geom: "column",
axis: "y",
xAxisId: "x",
xField: "month",
...
}
]
}

Chart type inference examples:
• All geom: "column" & axis not stacked → "column".
• All geom: "area" & axis stacked → "stackedArea".
• Mixed line + column → "combo".
• All geom: "stream" → "stream".

8.3 Other builders
• Axis.js – base AxisBase, CategoryAxis, ValueAxis, DateAxis.
• Series.js – logical series spec:
• field (value field)
• geom (column, line, area, dot, stream, etc.)
• axis / yAxisId
• angleField (for polar)
• Theme.js, Legend.js, Cursor.js, Scrollbars.js – define props merged into top-level config.

⸻

9. Config Patterns

9.1 General Shape

All charts share this top-level config shape:

{
container: "chartdiv",
dataLoader: { ... }, // optional
data: [ ... ], // attached by createChart after load/normalize
engine: {
engineType: "XY" | "Radial" | "Pie" | ...,
chartType: "column" | "line" | "heatmap" | "radar" | "polarLine" | ...,
// engine-specific keys:
categoryField: "month", // XY / radar
radial: { startAngle, endAngle, innerRadius }, // radial
axes: { x: {...}, y: [...] },
series: [ {...}, ... ],
},
theme: { ... },
legend: { ... },
cursor: { ... },
scrollbars: { ... },
}

9.2 Example – Column chart

import { XY } from "../../builder/XY.js";
import { Series } from "../../builder/Series.js";
import { Chart } from "../../builder/Chart.js";

const chartConfig = new Chart()
.htmlContainer("chartdiv")
.dataLoader({
type: "csv",
url: "./data/category-columns.csv",
delimiter: ",",
})
.engine(
new XY()
.category("month")
.addSeries(new Series("revenue").geom("column"))
.build()
)
.build();

export default chartConfig;

9.3 Example – Heatmap (Cartesian)

import { Chart } from "../../builder/Chart.js";

const chartConfig = new Chart()
.htmlContainer("chartdiv")
.dataLoader({
type: "csv",
url: "./data/heatmap.csv",
delimiter: ",",
})
.engine({
engineType: "XY",
chartType: "heatmap",
axes: {
x: { id: "x", type: "category", field: "hour" },
y: [{ id: "y", type: "category", field: "weekday" }],
},
series: [
{ field: "value", name: "Activity" },
],
})
.build();

export default chartConfig;

9.4 Example – Scatter

import { Chart } from "../../builder/Chart.js";

const chartConfig = new Chart()
.htmlContainer("chartdiv")
.dataLoader({
type: "csv",
url: "./data/scatter.csv",
delimiter: ",",
})
.engine({
engineType: "XY",
chartType: "scatter",
axes: {
x: { id: "x", type: "value", field: "x" },
y: [{ id: "y", type: "value", field: "y" }],
},
series: [
{
name: "Points",
xField: "x",
yField: "y",
radius: 4,
},
],
})
.build();

export default chartConfig;

9.5 Example – Polar scatter with auto angle normalization

CSV:

x,y
10,20
15,35
20,15
...

Config:

import { Chart } from "../../builder/Chart.js";

const chartConfig = new Chart()
.htmlContainer("chartdiv")
.dataLoader({
type: "csv",
url: "./data/polar-xy.csv",
delimiter: ",",
})
.engine({
engineType: "Radial",
chartType: "polarScatter",
radial: { startAngle: 0, endAngle: 360, innerRadius: 0 },
axes: {
x: { id: "angle", type: "value", field: "x" },
y: [{ id: "radius", type: "value", min: 0 }],
},
series: [
{
angleField: "x",
field: "y",
name: "Points",
geom: "dot",
},
],
})
.build();

export default chartConfig;

\_baseCircularSeries will:
• Detect polar mode via chartType and axes.x.type === "value".
• Compute angle domain [min(x), max(x)] and map to [startAngle, endAngle].
• Render bullets only (geom: "dot").

⸻

10. Future Directions

This spec is structured so you can bolt on new engines and chart families without touching createChart.

10.1 Pie Engine
• engineType: "Pie".
• chartType: "pie" | "donut" | "nestedDonut" | "funnel" | "pyramid".
• No axes; just series with categoryField + valueField.
• Likely a base createPieChart + wrappers per chartType.

10.2 Gauge Engine
• engineType: "Radial" or "Gauge" (TBD).
• chartType variants:
• gaugeCircular, gaugeSemi, gaugeSolid, gaugeMultipart.
• Config heavily focused on:
• min, max, value.
• Bands, thresholds, ticks, labels, needle/hand.

10.3 Hierarchy, Map, Flow
• Hierarchy: engineType: "Hierarchy" (tree, treemap, sunburst, force).
• Map: engineType: "Map" (choropleth, bubble, flow maps).
• Flow: engineType: "Flow" (Sankey, chord).

The engine pattern + registry + chart files + decorators used here will scale to all of these.

⸻

This document is the main reference for how the current chart lib is structured.

When adding new chart types or engines, follow this pattern: 1. Define or extend an engine if the coordinate system / semantics differ. 2. Add chart files under src/charts/<engineType>/... that consume the engine. 3. Wire them via registry.js using (engineType, chartType) keys. 4. Optionally add builder helpers for smoother config construction.

```

```

```

```
