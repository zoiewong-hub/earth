import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { BokehPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/BokehPass.js/+esm';


function createLightSpriteTexture(THREERef, inner, outer) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREERef.CanvasTexture(canvas);
  texture.colorSpace = THREERef.SRGBColorSpace;
  return texture;
}

function createStars(THREERef) {
  const geometry = new THREERef.BufferGeometry();
  const vertices = [];
  const colors = [];
  const base = new THREERef.Color();

  for (let i = 0; i < 2000; i += 1) {
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
    size: 0.028,
    transparent: true,
    opacity: 0.32,
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
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffe7c9, 0.34);
  const hemi = new THREE.HemisphereLight(0xffd6a1, 0x1a1f2e, 0.46);
  const sun = new THREE.DirectionalLight(0xffdfad, 1.65);
  sun.position.set(5.8, 1.8, 3.2);

  const rim = new THREE.DirectionalLight(0xffbf84, 0.2);
  rim.position.set(-4.4, -0.8, -3.8);

  const fill = new THREE.PointLight(0xffd9b0, 0.26, 13, 2);
  fill.position.set(0, 0.5, 3.2);

  const sunCore = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLightSpriteTexture(THREE, 'rgba(255,245,223,1)', 'rgba(255,186,108,0.72)'),
      color: 0xfff1dc,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunCore.scale.setScalar(0.86);

  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLightSpriteTexture(THREE, 'rgba(255,205,138,0.58)', 'rgba(255,143,64,0.22)'),
      color: 0xffd39d,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunHalo.scale.setScalar(1.95);

  scene.add(ambient, hemi, sun, rim, fill, sunCore, sunHalo);

  const stars = createStars(THREE);
  scene.add(stars);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.33, 0.75, 0.95);
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

    ambient.intensity = 0.28 + beat * 0.12;
    hemi.intensity = 0.38 + beat * 0.16;
    rim.intensity = 0.14 + (1 - beat) * 0.12;
    fill.intensity = 0.2 + micro * 0.1;

    hemi.color.setHSL(0.1 + beat * 0.02, 0.48, 0.67 + beat * 0.06);
    hemi.groundColor.setHSL(0.62, 0.2, 0.12 + (1 - beat) * 0.06);
    fill.color.setHSL(0.09 + micro * 0.02, 0.56, 0.64 + micro * 0.06);
    sun.color.setHSL(0.102 + beat * 0.015, 0.6, 0.73 + beat * 0.06);
    rim.color.setHSL(0.08 + micro * 0.015, 0.54, 0.58 + micro * 0.05);

    sunCore.position.copy(sun.position);
    sunHalo.position.copy(sun.position);
    sunCore.material.opacity = 0.5 + micro * 0.18;
    sunHalo.material.opacity = 0.22 + beat * 0.16;
    const haloScale = 1.75 + micro * 0.22;
    sunHalo.scale.setScalar(haloScale);
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
