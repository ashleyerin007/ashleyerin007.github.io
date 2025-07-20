// Entry point
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadOverview();
});

// csv values mapped to TopoJSON state keys
const stateAbbrev = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY"
};

function setupNavigation() {
  document.getElementById('btn-overview').addEventListener('click', loadOverview);
  document.getElementById('btn-role').addEventListener('click', loadByRole);
  document.getElementById('btn-company').addEventListener('click', loadByCompany);
  document.getElementById('btn-equity').addEventListener('click', loadEquity);
  document.getElementById('btn-education').addEventListener('click', loadEducation);
}

function clearVis() {
  d3.select('#vis-container').html('');
}

// Placeholder views
function loadOverview() {
  clearVis();
  //d3.select('#vis-container').append('p').text('Loading salary overview map...');
  // TODO: render map + summary stats
  const width = 960;
  const height = 600;

  const svg = d3.select('#vis-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // projection and path generator
  const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1000);

  const path = d3.geoPath().projection(projection);

  // Salary data
  d3.csv("2025 Biotech Salary.csv").then(data => {
    // U.S. entries
    const usData = data.filter(d => d["Country"] == "United States");
    console.log("Filtered US entries:", usData.length);

    // salary value as number
    usData.forEach(d => {
      //d.Salary = +d["Annual Base Salary"].replace(/[^0-9.]/g, '');
      const rawSalary = d["Annual Base Salary"];
      if (rawSalary) {
        d.Salary = +rawSalary.replace(/[^0-9.]/g, '');
      } else {
        d.Salary = undefined;
      }
    });

    // Remove undefined values
    const cleanData = usData.filter(d => d.Salary !== undefined);

    // Group by US State and find avg salary
    const salaryByState = d3.rollup(
      cleanData,
      v => d3.mean(v, d => d.Salary),
      d => d["US State"]);

    console.log("Average salaries by state:", Object.fromEntries(salaryByState));

  // Map conversion to plain object
  const salaryObj = Object.fromEntries(salaryByState);

  // color scale
  const color = d3.scaleQuantize()
    .domain(d3.extent(Array.from(salaryByState.values())))
    .range(d3.schemeBlues[7]);

  // Load TopoJSON and draw map
  d3.json("states-10m.json").then(cleanData => {
    const states = topojson.feature(cleanData, cleanData.objects.states).features;

    console.log("Average salaries by state:", Object.fromEntries(salaryByState));

    svg.append('g')
      .selectAll('path')
      .data(states)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const stateName = d.properties.name;
        const abbrev = stateAbbrev[stateName];
        const avgSalary = salaryByState.get(stateName); // or .get(abbrev)
        return avgSalary ? color(avgSalary) : '#ccc';
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);

    // State borders
    svg.append("path")
      .datum(topojson.mesh(cleanData, cleanData.objects.states, (a,b) => a !== b))
      .attr("fill", "none")
      .attr("stroke", "#333")
      .attr("stroke-linejoin", "round")
      .attr("d", path);

    });

  });

}

function loadByRole() {
  clearVis();
  d3.select('#vis-container').append('p').text('Salaries by Role and Level (Coming Soon)');
}

function loadByCompany() {
  clearVis();
  d3.select('#vis-container').append('p').text('Compensation Breakdown by Company Type (Coming Soon)');
}

function loadEquity() {
  clearVis();
  d3.select('#vis-container').append('p').text('Equity, Gender, and Race Analysis (Coming Soon)');
}

function loadEducation() {
  clearVis();
  d3.select('#vis-container').append('p').text('Education vs Salary (Coming Soon)');
}
