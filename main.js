// main.js

import { renderScene0, renderNextScene } from './sceneController.js';

document.addEventListener("DOMContentLoaded", () => {

  // Initialize the first scene
  renderScene0();

  /// Auto-scroll to Scene 2 after a short delay
  setTimeout(() => {
    renderNextScene();  // → Scene 2
  }, 2000); // adjust timing as needed

  // Auto-scroll to Scene 3 (map) after another delay
  setTimeout(() => {
    renderNextScene();  // → Scene 3
  }, 4000); // spacing between scrolls
});

