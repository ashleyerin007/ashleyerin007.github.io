import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Parse formats
const parseFullDate = d3.timeParse("%d-%b-%y");
const parseMonthDay = d3.timeParse("%d-%b");

export async function loadLayoffData(csvPath = "fierce_layoffs.csv") {
  const currentYear = new Date().getFullYear();

  const data = await d3.csv(csvPath, row => {
    // Attempt to parse the date
    let date = parseFullDate(row["Date"]);
    if (!date) {
      date = parseMonthDay(row["Date"]);
      if (date) date.setFullYear(+row["Year"] || currentYear);
    }

    return {
      year: +row["Year"] || (date ? date.getFullYear() : null),
      date: date || null,
      month: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : null,
      company: row["Company"]?.trim() || null,
      percentReduction: parsePercent(row["% reduction"]),
      numLaidOff: parseNumber(row["No of employees affected"]),
      employeesLeft: parseNumber(row["Employees left"]),
      state: row["Location (US)"]?.trim() || null,
      cityOrNotes: row["Notes"]?.trim() || null,
      country: row["Country (non-US)"]?.trim() || null
    };
  });

  return data;
}

// Helper: parse percent like "25%" -> 25
function parsePercent(val) {
  if (!val) return null;
  const match = val.match(/^(\d+(?:\.\d+)?)%$/);
  return match ? +match[1] : null;
}

// Helper: safely parse numbers
function parseNumber(val) {
  const num = +val;
  return isNaN(num) ? null : num;
}
