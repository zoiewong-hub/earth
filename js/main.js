import { createSceneSystem } from './scene.js';
import { createEarthSystem } from './earth.js';
import { createInteractionSystem } from './interaction.js';

const container = document.getElementById('app');
const sceneSystem = createSceneSystem(container);

const earthSystem = await createEarthSystem(sceneSystem.THREE, sceneSystem.scene, sceneSystem.sun);

let autoMode = false;
const interaction = createInteractionSystem({
  ...sceneSystem,
  earthSystem,
  onAutoMode(value) {
    autoMode = value;
  },
});

earthSystem.intro(sceneSystem.camera, sceneSystem.ambient, sceneSystem.hemi);

let time = 0;
function animate() {
  requestAnimationFrame(animate);

  time += 0.0016;
  sceneSystem.sun.position.set(Math.cos(time) * 6.0, 1.5 + Math.sin(time * 0.7) * 1.2, Math.sin(time) * 4.5);
  sceneSystem.updateEnvironmentLighting(time);

  earthSystem.updateMaterial(time);
  earthSystem.clouds.rotation.y += 0.0007;
  earthSystem.clouds.rotation.x += 0.00006;

  const starTwinkle = 0.33 + (Math.sin(time * 34) * 0.08 + Math.cos(time * 17) * 0.04);
  sceneSystem.stars.material.opacity = starTwinkle;
  sceneSystem.stars.rotation.y += 0.00014;

  if (autoMode) {
    earthSystem.group.rotation.y += 0.0018;
    earthSystem.group.rotation.x += (0.05 - earthSystem.group.rotation.x) * 0.012;
  }

  interaction.update();
  sceneSystem.composer.render();
}

animate();
