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
  .attr("viewBox", "0 0 960 600")
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("responsive-svg", true);

const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

let fullSalaryData = [];
let selectedState = null;
let expandedRole = null;

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

      if (selectedState === stateName) {
        selectedState = null;
        d3.select("#state-details").classed("hidden", true);
        return;
      }

      selectedState = stateName;
      d3.select("#state-details").classed("hidden", false);
      d3.select("#state-title").text(stateName);

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

      const rolesWithMultipleEntries = jobStats.filter(([_, stats]) => stats.count > 1);

      const topJobs = jobStats
        .sort((a, b) => d3.descending(a[1].count, b[1].count))
        .slice(0, 5);

      const multiEntryRoles = new Set(
        topJobs
          .filter(([_, stats]) => stats.count > 1)
          .map(([title]) => title)
      );

      let html = `<h4>Top Job Titles in ${stateName}</h4><ul>`;
      topJobs.forEach(([title, stats]) => {
        const isInteractive = multiEntryRoles.has(title);
        const roleId = title.replace(/\W+/g, "-").toLowerCase();

        if (isInteractive) {
          html += `<li><a href="#" class="role-link" data-role="${title}" data-roleid="${roleId}">${title}</a> — (${stats.count}), avg salary: $${Math.round(stats.avgSalary).toLocaleString()}</li>`;
        } else {
          html += `<li>${title} — (${stats.count}), avg salary: $${Math.round(stats.avgSalary).toLocaleString()}</li>`;
        }
      });
      html += `</ul>`;

      d3.select("#state-charts").html(html);

      d3.selectAll(".role-link").on("click", (event) => {
        event.preventDefault();

        const role = event.target.dataset.role;

        if (expandedRole === role) {
          d3.select("#role-detail-box").html("");
          expandedRole = null;
          return;
        }

        expandedRole = role;

        const roleRows = stateRows.filter(d =>
          d["Job Title"] === role &&
          d["Annual Base Salary"] &&
          !isNaN(d["Annual Base Salary"]) &&
          d["Year"]
        );

        const groupedByYear = d3.groups(roleRows, d => d["Year"]);

        const summary = groupedByYear
          .sort(([a], [b]) => d3.ascending(+a, +b))
          .map(([year, rows]) => {
            const salaries = rows.map(r => +r["Annual Base Salary"]);
            return {
              year,
              min: d3.min(salaries),
              max: d3.max(salaries)
            };
          });

        let tableHtml = `<h4>${role} — Min/Max Salary by Year</h4><table><thead><tr><th>Year</th><th>Min</th><th>Max</th></tr></thead><tbody>`;
        summary.forEach(({ year, min, max }) => {
          tableHtml += `<tr><td>${year}</td><td>$${Math.round(min).toLocaleString()}</td><td>$${Math.round(max).toLocaleString()}</td></tr>`;
        });
        tableHtml += `</tbody></table>`;

        d3.select("#role-detail-box").html(tableHtml);
      });
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
