import {
  getAverageSalariesByState,
  cleanLayoffData,
  getLayoffCountsByStateYear,
  loadFullSalaryData
} from './utils.js';

const width = 960;
const height = 600;

const svg = d3.select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

let fullSalaryData = [];
let selectedState = null;

Promise.all([
  getAverageSalariesByState("Sal.csv"),
  loadFullSalaryData("Sal.csv"),
  d3.csv("fierce_layoffs.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([averageSalaries, loadedFullData, rawLayoffData, us]) => {
  fullSalaryData = loadedFullData;

  const cleanedLayoffs = cleanLayoffData(rawLayoffData);
  const layoffSummary = getLayoffCountsByStateYear(cleanedLayoffs);
  const states = topojson.feature(us, us.objects.states).features;

  const colorScale = d3.scaleSequential()
    .domain(d3.extent(Object.values(averageSalaries)))
    .interpolator(d3.interpolateBlues);

  // Draw map
  svg.selectAll("path")
    .data(states)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.name;
      const salary = averageSalaries[name];
      return salary ? colorScale(salary) : "#ccc";
    })
    .attr("stroke", "#fff")
    .on("mouseover", (event, d) => {
      const name = d.properties.name;
      const salary = averageSalaries[name];
      const layoffs = layoffSummary[name];

      let layoffInfo = "Layoffs: No data";
      if (layoffs) {
        const yearSummaries = Object.entries(layoffs)
          .sort(([a], [b]) => a - b)
          .map(([year, count]) => `${year} (${count})`)
          .join(", ");
        layoffInfo = `Layoffs: ${yearSummaries}`;
      }

      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`${name}<br>Avg Salary: $${salary ? salary.toLocaleString() : "No data"}<br>${layoffInfo}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", (event, d) => {
      const stateName = d.properties.name;
      console.log("Clicked state:", stateName);

      // Toggle logic: if same state is clicked again, close the panel
      if (selectedState === stateName) {
        selectedState = null;
        d3.select("#state-details").classed("hidden", true);
        return;
      }

selectedState = stateName; // set new state as selected
d3.select("#state-details").classed("hidden", false);
d3.select("#state-title").text(stateName);

      //d3.select("#state-charts").html("Loading data for " + stateName + "...");
      // Filter full salary data to the selected state
      //const stateRows = fullSalaryData.filter(d => d["State_inferred"] === stateName);
      const stateRows = fullSalaryData.filter(d => {
        const state = d["State_inferred"] || d["US State"];
        return state && state.trim().toLowerCase() === stateName.toLowerCase();
      });

      if (stateRows.length === 0) {
        d3.select("#state-charts").html(`<p>No job data available for <strong>${stateName}</strong>.</p>`);
        return;
      }


      const jobStats = d3.rollups(
        stateRows.filter(d => d["Annual Base Salary"] && !isNaN(d["Annual Base Salary"])),
        v => ({
          count: v.length,
          avgSalary: d3.mean(v, d => +d["Annual Base Salary"])
        }),
        d => d["Job Title"]
      );

      // Sort and take top 5 by count
      const topJobs = jobStats
        .sort((a, b) => d3.descending(a[1].count, b[1].count))
        .slice(0, 5);

      // Create HTML list
      let html = `<h4>Top Job Titles in ${stateName}</h4><ul>`;
      topJobs.forEach(([title, stats]) => {
        html += `<li>${title} — (${stats.count}), avg salary: $${Math.round(stats.avgSalary).toLocaleString()}</li>`;
      });
      html += `</ul>`;

      d3.select("#state-charts").html(html);
    });

  // Draw legend
  const legendWidth = 200;
  const legendHeight = 10;

  const legendSvg = svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

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
    .style("fill", "url(#legend-gradient)");

  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => `$${Math.round(d / 1000)}k`);

  legendSvg.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);
});