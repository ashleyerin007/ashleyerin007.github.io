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

