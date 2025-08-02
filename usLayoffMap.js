import {
  cleanLayoffData,
  getLayoffCountsByStateYear,
} from './utils.js';

const width = 960;
const height = 600;

let selectedLayoffState = null;

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #999")
  .style("padding", "6px")
  .style("font-size", "12px")
  .style("color", "#000")
  .style("pointer-events", "none")
  .style("z-index", "9999")
  .style("opacity", 0)
  .style("display", "block");


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
  console.log("FULL LAYOFF COUNTS BY STATE + YEAR", layoffCounts);

  const layoffsByStateYear = {};
  for (const row of cleanedLayoffs) {
    const state = row["Location (US)"]?.trim();
    const year = row["Year"];
    const pct = row["Percent Reduction"];
    const company = row["Company"];

    if (!state || !year || pct == null) continue;

    if (!layoffsByStateYear[state]) layoffsByStateYear[state] = {};
    if (!layoffsByStateYear[state][year]) layoffsByStateYear[state][year] = [];

    layoffsByStateYear[state][year].push({ company, pct });
  }

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
      const sortedYears = Object.keys(counts).sort();
      const total = sortedYears.reduce((sum, y) => sum + counts[y], 0);
      const yearBreakdown = sortedYears
        .map(y => `${y}: ${counts[y]}`)
        .join("<br>");

      d3.select("#layoff-details").classed("hidden", false);
      d3.select("#layoff-state-title").text(name);
      d3.select("#layoff-state-content").html(`
        <p><strong>Total Layoffs:</strong> ${total}</p>
        <p>${yearBreakdown || "No data available"}</p>
      `);

      const yearsAvailable = Object.keys(layoffsByStateYear[name] || {}).sort();

      if (yearsAvailable.length > 0) {
        // Add year links
        d3.select("#layoff-year-links").html(
          `<p><strong>View % Reduction:</strong> ${
            yearsAvailable.map(y => `<a href="#" class="year-link" data-year="${y}">${y}</a>`).join(" | ")
          }</p>`
        );

        // Draw the first year's chart by default
        drawLayoffChart(name, yearsAvailable[0]);

        // Handle clicks on year links
        d3.selectAll(".year-link").on("click", (event) => {
          event.preventDefault();
          const selectedYear = event.target.dataset.year;
          drawLayoffChart(name, selectedYear);
        });
      } else {
        // If no data, clear any chart or links
        d3.select("#layoff-year-links").html("");
        d3.select("#layoff-bar-chart").html("<p>No % reduction data available.</p>");
      }

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

    function drawLayoffChart(state, year) {
      const data = layoffsByStateYear[state]?.[year] || [];

      d3.select("#layoff-bar-chart").html(""); // Clear previous chart

      const margin = { top: 10, right: 20, bottom: 40, left: 60 };
      const width = 350 - margin.left - margin.right;
      const height = 200 - margin.top - margin.bottom;

      const svg = d3.select("#layoff-bar-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d.company))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.pct) || 100])
        .nice()
        .range([height, 0]);


      svg.append("g")
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", d => x(d.company))
        .attr("y", d => y(d.pct))
        .attr("height", d => height - y(d.pct))
        .attr("width", x.bandwidth())
        .attr("fill", "#d62728")
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`<strong>${d.company}</strong><br>${d.pct}% reduction`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(300).style("opacity", 0);
        });


      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d + "%"));
    }

});

