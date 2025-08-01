console.log("Layoff map loaded");import {
  cleanLayoffData,
  getLayoffCountsByStateYear,
} from './utils.js';

const width = 960;
const height = 600;

const svg = d3.select("#layoff-map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0)

Promise.all([
  d3.csv("fierce_layoffs.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
]).then(([rawLayoffData, us]) => {
  const cleanedLayoffs = cleanLayoffData(rawLayoffData);
  const layoffCounts = getLayoffCountsByStateYear(cleanedLayoffs);

  const states = topojson.feature(us, us.objects.states).features;

  // layoffs per state
  const totalLayoffsByState = {};
  for (const [state, yearCounts] of Object.entries(layoffCounts)) {
    totalLayoffsByState[state] = Object.entries(yearCounts)
      .filter(([year]) => year === "2024" || year === "2025")
      .reduce((sum, [, count]) => sum + count, 0);
  }

	const [min, max] = d3.extent(Object.values(totalLayoffsByState));

	const colorScale = d3.scaleSequential()
	  .domain([max, min])  // reverse the domain
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
    .attr("stroke", "#fff");

    // Add legend
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
