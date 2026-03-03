import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const labels = ['Pacific Rim', 'Atlantic Belt', 'Aurora Zone', 'Equatorial Drift', 'Polar Crown'];

function createTextureCanvas(width = 2048, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createDayCanvas() {
  const canvas = createTextureCanvas();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2a6fb6');
  gradient.addColorStop(1, '#174878');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const rx = 22 + Math.random() * 130;
    const ry = 14 + Math.random() * 70;
    const color = Math.random() > 0.5 ? 'rgba(86,146,84,0.38)' : 'rgba(149,125,78,0.28)';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function createNightCanvas() {
  const canvas = createTextureCanvas();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#05070f');
  gradient.addColorStop(1, '#091326');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 4600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 0.4 + Math.random() * 1.6;
    const alpha = Math.random() * 0.75;
    ctx.fillStyle = `rgba(255,200,110,${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  return canvas;
}

function createCloudCanvas() {
  const canvas = createTextureCanvas();
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const rx = 18 + Math.random() * 70;
    const ry = 10 + Math.random() * 35;
    const alpha = 0.06 + Math.random() * 0.23;
    ctx.fillStyle = `rgba(245,250,255,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function createEarthTextures(THREE) {
  const dayTexture = new THREE.CanvasTexture(createDayCanvas());
  const nightTexture = new THREE.CanvasTexture(createNightCanvas());
  const cloudTexture = new THREE.CanvasTexture(createCloudCanvas());

  [dayTexture, nightTexture, cloudTexture].forEach((texture) => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  });

  return { dayTexture, nightTexture, cloudTexture };
}

export function createEarthSystem(THREE, scene) {
  const group = new THREE.Group();
  scene.add(group);

  const { dayTexture, nightTexture, cloudTexture } = createEarthTextures(THREE);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 96, 96),
    new THREE.MeshStandardMaterial({
      map: dayTexture,
      emissiveMap: nightTexture,
      emissive: 0xb47d52,
      emissiveIntensity: 0.2,
      roughness: 0.78,
      metalness: 0.05,
    })
  );

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.37, 96, 96),
    new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true, opacity: 0.45, depthWrite: false })
  );

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0x6cb7ff, transparent: true, opacity: 0.12, side: THREE.BackSide })
  );

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xff7b3d, transparent: true, opacity: 0 })
  );

  const pulseParticles = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0x8bc5ff, size: 0.04, transparent: true, opacity: 0, depthWrite: false })
  );
  const p = [];
  for (let i = 0; i < 260; i += 1) {
    p.push((Math.random() - 0.5) * 4.4, (Math.random() - 0.5) * 4.4, (Math.random() - 0.5) * 4.4);
  }
  pulseParticles.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));

  group.add(earth, clouds, atmosphere, core, pulseParticles);

  function intro() {
    group.scale.set(0.78, 0.78, 0.78);
    group.rotation.set(0.3, -1.1, 0.12);
    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 2.2, ease: 'power2.inOut' });
    gsap.to(group.rotation, { x: 0.06, y: -0.35, z: 0, duration: 2.6, ease: 'power2.inOut' });
  }

  function clickBounce() {
    gsap.to(group.scale, { x: 1.06, y: 1.06, z: 1.06, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 });
  }

  function togglePulse(on) {
    gsap.to(earth.material, { emissiveIntensity: on ? 0.6 : 0.2, duration: 1.2, ease: 'sine.inOut' });
    gsap.to(atmosphere.material, { opacity: on ? 0.23 : 0.12, duration: 1.2, ease: 'sine.inOut' });
    gsap.to(pulseParticles.material, { opacity: on ? 0.65 : 0, duration: 1, ease: 'sine.inOut' });
  }

  function crackEasterEgg() {
    const tl = gsap.timeline();
    tl.to(core.material, { opacity: 0.9, duration: 0.26, ease: 'power2.out' }, 0)
      .to(earth.scale, { x: 1.08, y: 0.92, z: 1.08, duration: 0.3, ease: 'power1.out' }, 0)
      .to(clouds.material, { opacity: 0.1, duration: 0.25, ease: 'power1.out' }, 0)
      .to(earth.scale, { x: 1, y: 1, z: 1, duration: 0.65, ease: 'power2.inOut' }, 0.34)
      .to(core.material, { opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.48)
      .to(clouds.material, { opacity: 0.45, duration: 0.5, ease: 'power2.inOut' }, 0.52);
  }

  function labelText() {
    return labels[Math.floor(Math.random() * labels.length)];
  }

  return { group, earth, clouds, atmosphere, pulseParticles, intro, clickBounce, togglePulse, crackEasterEgg, labelText };
}
