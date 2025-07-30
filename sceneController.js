const state = {
  currentScene: 0
};

export function renderScene0() {
  state.currentScene = 1;
  renderScene1();
}

export function renderScene1() {
  console.log("📘 Scene 1: Salary Trends");
  document.querySelector("#salary-trends")?.scrollIntoView({ behavior: "smooth" });
}

export function renderScene2() {
  console.log("📗 Scene 2: Layoffs");
  document.querySelector("#layoffs-section")?.scrollIntoView({ behavior: "smooth" });
}

export function renderScene3() {
  console.log("📙 Scene 3: US Map");
  document.querySelector("#map-section")?.scrollIntoView({ behavior: "smooth" });
}

export function renderNextScene() {
  state.currentScene++;
  if (state.currentScene === 2) {
    renderScene2();
  } else if (state.currentScene === 3) {
    renderScene3();
  } else {
    console.log("📕 End of guided scenes");
  }
}