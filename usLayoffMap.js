import {
  cleanLayoffData,
  getLayoffCountsByStateYear,
} from './utils.js';

const width = 960;
const height = 600;

let selectedLayoffState = null;

const svg = d3.select("#layoff-map")
  .append("svg")
  .attr("viewBox", "0 0 960 600")
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("responsive-svg", true);

const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
const path = d3.geoPath().projection(projection);

Promise.all([
  d3.csv("fierce_layoffs.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([rawLayoffData, us]) => {
  const cleanedLayoffs = cleanLayoffData(rawLayoffData);
  const layoffCounts = getLayoffCountsByStateYear(cleanedLayoffs);

  const states = topojson.feature(us, us.objects.states).features;

  const totalLayoffsByState = {};
  for (const [state, yearCounts] of Object.entries(layoffCounts)) {
    totalLayoffsByState[state] = Object.entries(yearCounts)
      .filter(([year]) => year === "2024" || year === "2025")
      .reduce((sum, [, count]) => sum + count, 0);
  }

  const [min, max] = d3.extent(Object.values(totalLayoffsByState));

  const colorScale = d3.scaleSequential()
    .domain([max, min])  // reversed
    .interpolator(d3.interpolateSpectral);

  svg.selectAll("path")
    .data(states)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.name;
      const count = totalLayoffsByState[name];
      return count ? colorScale(count) : "#eee";
    })
    .attr("stroke", "#fff")
    .on("click", (event, d) => {
      const name = d.properties.name;

      // Toggle off if same state clicked again
      if (selectedLayoffState === name) {
        selectedLayoffState = null;
        d3.select("#layoff-details").classed("hidden", true);
        return;
      }

      selectedLayoffState = name;

      const counts = layoffCounts[name] || {};
      const total = (counts["2024"] || 0) + (counts["2025"] || 0);
      const yearBreakdown = ["2024", "2025"]
        .filter(y => counts[y])
        .map(y => `${y}: ${counts[y]}`)
        .join("<br>");

      d3.select("#layoff-details").classed("hidden", false);
      d3.select("#layoff-state-title").text(name);
      d3.select("#layoff-state-content").html(`
        <p><strong>Total Layoffs:</strong> ${total}</p>
        <p>${yearBreakdown || "No data available"}</p>
      `);
    });

  // Legend
  const legendWidth = 200;
  const legendHeight = 10;

  const legendSvg = svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "layoff-legend-gradient");

  linearGradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .join("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d =>
      colorScale(
        d * (colorScale.domain()[1] - colorScale.domain()[0]) + colorScale.domain()[0]
      )
    );

  legendSvg.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#layoff-legend-gradient)");

  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => `${d}`);

  legendSvg.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);
});
