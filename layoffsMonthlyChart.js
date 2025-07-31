import { loadLayoffData } from './layoffsData.js';

document.addEventListener("DOMContentLoaded", async () => {
  const data = await loadLayoffData("fierce_layoffs.csv");

  // total layoffs per month
  const layoffsPerMonth = d3.rollup(
    data,
    //v => d3.sum(v, d => d.numLaidOff || 1), // Use numLaidOff, fallback to count of events
    v => v.length,
    d => d.month
  );

  // sorted array
  const lineData = Array.from(layoffsPerMonth, ([month, total]) => ({ month, total }))
    .filter(d => d.month) // Remove nulls
    .sort((a, b) => d3.ascending(a.month, b.month));

  drawLineChart(lineData);
});

function drawLineChart(data) {
  const margin = { top: 30, right: 20, bottom: 25, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  const svg = d3.select("#vis-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X: time scale
  const parseMonth = d3.timeParse("%Y-%m");
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => parseMonth(d.month)))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total)])
    .nice()
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(parseMonth(d.month)))
    .y(d => y(d.total))
    .curve(d3.curveMonotoneX);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Line
  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#2c7fb8")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Biotech Layoffs per Month");

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(parseMonth(d.month)))
    .attr("cy", d => y(d.total))
    .attr("r", 3)
    .attr("fill", "#2c7fb8");
}
