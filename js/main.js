import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { createSceneSystem } from './scene.js';
import { createEarthSystem } from './earth.js';
import { createInteractionSystem } from './interaction.js';

const container = document.getElementById('app');
const sceneSystem = createSceneSystem(container);

const earthSystem = await createEarthSystem(sceneSystem.THREE, sceneSystem.scene, sceneSystem.sun);

let autoMode = false;
let pulseMode = false;
const interaction = createInteractionSystem({
  ...sceneSystem,
  earthSystem,
  onAutoMode(value) {
    autoMode = value;
    toggleActiveButton('auto', value);
  },
});

earthSystem.intro(sceneSystem.camera, sceneSystem.ambient, sceneSystem.hemi);

function toggleActiveButton(action, active) {
  const btn = document.querySelector(`.nav-btn[data-action="${action}"]`);
  if (!btn) return;
  btn.classList.toggle('is-active', active);
}

function setupNav() {
  document.querySelector('.bottom-nav')?.addEventListener('click', (event) => {
    const btn = event.target.closest('.nav-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'auto') {
      autoMode = !autoMode;
      toggleActiveButton('auto', autoMode);
      return;
    }

    if (action === 'pulse') {
      pulseMode = !pulseMode;
      earthSystem.togglePulse(pulseMode);
      toggleActiveButton('pulse', pulseMode);
      return;
    }

    if (action === 'belt') {
      earthSystem.triggerOrbitalBelt?.();
      earthSystem.triggerPlayfulMode?.();
      return;
    }

    if (action === 'meteor') {
      earthSystem.triggerMeteorShower?.();
      return;
    }

    if (action === 'reset') {
      autoMode = false;
      toggleActiveButton('auto', false);
      gsap.to(sceneSystem.camera.position, { x: 0, y: 0.2, z: 5.7, duration: 1.0, ease: 'power2.inOut' });
      gsap.to(earthSystem.group.rotation, { x: 0.06, y: -0.33, z: 0, duration: 1.0, ease: 'power2.inOut' });
    }
  });
}

setupNav();

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
