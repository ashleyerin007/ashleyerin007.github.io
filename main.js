import { renderScene0, renderNextScene } from './sceneController.js';

document.addEventListener("DOMContentLoaded", () => {

  // first scene
  renderScene0();

  setTimeout(() => {
    renderNextScene(); 
  }, 2000);

  setTimeout(() => {
    renderNextScene();
  }, 4000);
});

document.addEventListener("DOMContentLoaded", () => {
  const salaryMapDiv = document.getElementById("map");
  const layoffMapDiv = document.getElementById("layoff-map");
  const mapTitle = document.getElementById("map-view-title");

  const salaryBtn = document.getElementById("show-salary-map");
  const layoffBtn = document.getElementById("show-layoff-map");

  salaryBtn.addEventListener("click", () => {
    salaryMapDiv.style.display = "block";
    layoffMapDiv.style.display = "none";
    mapTitle.textContent = "U.S. Salary Map";

    salaryBtn.classList.add("active");
    layoffBtn.classList.remove("active");
  });

  layoffBtn.addEventListener("click", () => {
    salaryMapDiv.style.display = "none";
    layoffMapDiv.style.display = "block";
    mapTitle.textContent = "U.S. Layoff Map";

    layoffBtn.classList.add("active");
    salaryBtn.classList.remove("active");
  });
});
