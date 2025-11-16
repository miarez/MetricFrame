// demo/main.js

import { createChart } from "../src/core/createChart.js";
import { loadData, normalizeDataForEngine } from "../src/utils/loadData.js";
import chartConfig from "./config/XY/catSeries/combo.js";
import { pp, debug } from "../src/utils/pp.js"; // optional, but handy

// debug();
async function bootstrap() {
  try {
    // Enable debug logging if you want
    // debug();
    pp.hr("Bootstrap start");

    // 1) Start from the builder-produced config
    const baseConfig = chartConfig;

    // 2) Load data if a dataLoader is present
    let data = [];
    if (baseConfig.dataLoader) {
      const raw = await loadData(baseConfig.dataLoader);
      data = normalizeDataForEngine(raw, baseConfig.engine);
      pp.log("Loaded rows:", data.length);
    }

    // 3) Create a final config object with attached data
    const config = {
      ...baseConfig,
      data,
    };

    pp.deep(config.data[0]);
    pp.deep(config);

    // 4) Create the chart
    const { root, chart } = createChart(config);

    // 5) Expose for console debugging
    window.root = root;
    window.chart = chart;

    pp.log("Chart created:", chart);
  } catch (err) {
    console.error("Error creating chart:", err);
  }
}

bootstrap();
