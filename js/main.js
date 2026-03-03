import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { createSceneSystem } from './scene.js';
import { createEarthSystem } from './earth.js';
import { createInteractionSystem } from './interaction.js';

const container = document.getElementById('app');
const sceneSystem = createSceneSystem(container);
const earthSystem = createEarthSystem(sceneSystem.THREE, sceneSystem.scene);

let autoMode = false;
const interactionSystem = createInteractionSystem({
  ...sceneSystem,
  earthSystem,
  onAutoMode(active) {
    autoMode = active;
  },
});

earthSystem.intro();

const sunPivot = { t: 0 };

function animate() {
  requestAnimationFrame(animate);

  interactionSystem.update();
  earthSystem.clouds.rotation.y += 0.0009;

  if (autoMode) {
    earthSystem.group.rotation.y += 0.0026;
    earthSystem.group.rotation.x = gsap.utils.interpolate(earthSystem.group.rotation.x, 0.08, 0.02);
  }

  sunPivot.t += 0.0014;
  sceneSystem.sun.position.x = Math.sin(sunPivot.t) * 6;
  sceneSystem.sun.position.z = Math.cos(sunPivot.t) * 4;

  sceneSystem.stars.rotation.y += 0.00015;
  sceneSystem.composer.render();
}

animate();
