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
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xb8d8ff, 0.38);
  const hemi = new THREE.HemisphereLight(0x8cb7ff, 0x1c2230, 0.52);
  const sun = new THREE.DirectionalLight(0xffe5b3, 1.9);
  sun.position.set(5.8, 1.8, 3.2);

  const rim = new THREE.DirectionalLight(0xffb36b, 0.26);
  rim.position.set(-4.4, -0.8, -3.8);

  const fill = new THREE.PointLight(0xffc98a, 0.35, 12, 2);
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
  sunCore.scale.setScalar(0.72);

  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLightSpriteTexture(THREE, 'rgba(255,205,138,0.58)', 'rgba(255,143,64,0.22)'),
      color: 0xffd39d,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunHalo.scale.setScalar(1.65);

  scene.add(ambient, hemi, sun, rim, fill, sunCore, sunHalo);

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
    fill.color.setHSL(0.095 + micro * 0.03, 0.74, 0.64 + micro * 0.08);
    sun.color.setHSL(0.105 + beat * 0.02, 0.72, 0.74 + beat * 0.08);
    rim.color.setHSL(0.075 + micro * 0.025, 0.7, 0.62 + micro * 0.07);

    sunCore.position.copy(sun.position);
    sunHalo.position.copy(sun.position);
    sunCore.material.opacity = 0.62 + micro * 0.26;
    sunHalo.material.opacity = 0.28 + beat * 0.24;
    const haloScale = 1.5 + micro * 0.28;
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
