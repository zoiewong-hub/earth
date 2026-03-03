import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.162.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.162.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.162.0/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createSceneSystem(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.25, 5.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x8eb8ff, 0.55);
  const sun = new THREE.DirectionalLight(0xdce7ff, 1.6);
  sun.position.set(5, 2, 3);
  scene.add(ambient, sun);

  const stars = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0x8ca3c9, size: 0.03, transparent: true, opacity: 0.35 })
  );
  const starData = [];
  for (let i = 0; i < 900; i += 1) {
    const r = 30 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starData.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  }
  stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(starData, 3));
  scene.add(stars);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.34, 0.65, 0.9);
  composer.addPass(bloom);

  function setBloomStrength(target) {
    bloom.strength = target;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onResize);

  return { THREE, scene, camera, renderer, composer, sun, stars, setBloomStrength };
}
