import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { BokehPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/BokehPass.js/+esm';

function createStars(THREERef) {
  const geometry = new THREERef.BufferGeometry();
  const vertices = [];
  const colors = [];
  const base = new THREERef.Color();

  for (let i = 0; i < 1400; i += 1) {
    const radius = 28 + Math.random() * 56;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    vertices.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    base.setHSL(0.58 + Math.random() * 0.08, 0.45, 0.6 + Math.random() * 0.25);
    colors.push(base.r, base.g, base.b);
  }

  geometry.setAttribute('position', new THREERef.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREERef.Float32BufferAttribute(colors, 3));

  const material = new THREERef.PointsMaterial({
    size: 0.035,
    transparent: true,
    opacity: 0.42,
    vertexColors: true,
    depthWrite: false,
    blending: THREERef.AdditiveBlending,
  });

  return new THREERef.Points(geometry, material);
}

export function createSceneSystem(container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 0.2, 6.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xb8d8ff, 0.38);
  const hemi = new THREE.HemisphereLight(0x8cb7ff, 0x1c2230, 0.52);
  const sun = new THREE.DirectionalLight(0xf5f8ff, 1.8);
  sun.position.set(5.8, 1.8, 3.2);

  const rim = new THREE.DirectionalLight(0x78a8ff, 0.36);
  rim.position.set(-4.4, -0.8, -3.8);

  const fill = new THREE.PointLight(0x7dd1ff, 0.45, 12, 2);
  fill.position.set(0, 0.5, 3.2);

  scene.add(ambient, hemi, sun, rim, fill);

  const stars = createStars(THREE);
  scene.add(stars);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.8, 0.9);
  composer.addPass(bloom);

  const bokeh = new BokehPass(scene, camera, {
    focus: 3.8,
    aperture: 0.00008,
    maxblur: 0.003,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  composer.addPass(bokeh);

  function setBloomStrength(value) {
    bloom.strength = value;
  }

  function setFocus(value) {
    bokeh.materialBokeh.uniforms.focus.value = value;
  }

  function updateEnvironmentLighting(time) {
    const beat = (Math.sin(time * 0.85) + 1) * 0.5;
    const micro = (Math.sin(time * 2.2) + 1) * 0.5;

    ambient.intensity = 0.3 + beat * 0.18;
    hemi.intensity = 0.45 + beat * 0.22;
    rim.intensity = 0.24 + (1 - beat) * 0.26;
    fill.intensity = 0.25 + micro * 0.18;

    hemi.color.setHSL(0.58 + beat * 0.03, 0.58, 0.68 + beat * 0.08);
    hemi.groundColor.setHSL(0.62, 0.24, 0.13 + (1 - beat) * 0.08);
    fill.color.setHSL(0.55 + micro * 0.05, 0.7, 0.66 + micro * 0.1);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onResize);

  return {
    THREE,
    scene,
    camera,
    renderer,
    composer,
    ambient,
    hemi,
    sun,
    stars,
    setBloomStrength,
    setFocus,
    updateEnvironmentLighting,
  };
}
