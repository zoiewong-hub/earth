import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const LABELS = ['Pacific Rim', 'Atlantic Glow', 'Aurora Band', 'Equatorial Stream', 'Polar Crown'];

function makeCanvas(width = 4096, height = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function buildFallback(type) {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');

  if (type === 'day') {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#2a6fb6');
    g.addColorStop(1, '#174878');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = Math.random() > 0.45 ? 'rgba(103,170,94,0.32)' : 'rgba(160,130,84,0.24)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 12 + Math.random() * 120, 8 + Math.random() * 50, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (type === 'night') {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#05070f');
    g.addColorStop(1, '#091326');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 9000; i += 1) {
      const a = Math.random() * 0.8;
      ctx.fillStyle = `rgba(255,198,112,${a})`;
      const size = 0.4 + Math.random() * 2;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, size, size);
    }
  }

  if (type === 'normal') {
    ctx.fillStyle = 'rgb(128,128,255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (type === 'specular') {
    ctx.fillStyle = '#1f2532';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.24})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 20 + Math.random() * 150, 10 + Math.random() * 60, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (type === 'clouds') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 2400; i += 1) {
      ctx.fillStyle = `rgba(245,250,255,${0.04 + Math.random() * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 14 + Math.random() * 95, 8 + Math.random() * 45, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

function loadTexture(loader, path, type, THREE) {
  return new Promise((resolve) => {
    loader.load(
      path,
      (texture) => {
        texture.colorSpace = type === 'normal' || type === 'specular' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      () => {
        const texture = new THREE.CanvasTexture(buildFallback(type));
        texture.colorSpace = type === 'normal' || type === 'specular' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      }
    );
  });
}

function makeAtmosphere(THREE) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      glowColor: { value: new THREE.Color(0x71b8ff) },
      intensity: { value: 0.85 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-worldPos.xyz);
        gl_Position = projectionMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
        float alpha = fresnel * 0.46 * intensity;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
  });
}

function applyNightBlend(material, nightTexture, specTexture, sunRef, THREE) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.nightMap = { value: nightTexture };
    shader.uniforms.specMask = { value: specTexture };
    shader.uniforms.sunDirection = { value: new THREE.Vector3() };

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D nightMap;
      uniform sampler2D specMask;
      uniform vec3 sunDirection;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      vec3 nSun = normalize(sunDirection);
      float nDotL = dot(normalize(vNormal), nSun);
      float nightFactor = smoothstep(0.25, -0.18, nDotL);
      vec3 nightColor = texture2D(nightMap, vMapUv).rgb;
      totalEmissiveRadiance += nightColor * nightFactor * 1.35;

      float specMaskVal = texture2D(specMask, vMapUv).r;
      float oceanSpec = smoothstep(0.15, 0.95, specMaskVal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfVec = normalize(nSun + viewDir);
      float gloss = pow(max(dot(normalize(vNormal), halfVec), 0.0), 60.0) * oceanSpec * 0.28;
      totalEmissiveRadiance += vec3(0.55, 0.68, 0.9) * gloss;`
    );

    material.userData.shader = shader;
  };

  material.userData.updateShader = () => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.sunDirection.value.copy(sunRef.position).normalize();
    }
  };
}

export async function createEarthSystem(THREE, scene, sun) {
  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  const [dayMap, nightMap, normalMap, specularMap, cloudMap] = await Promise.all([
    loadTexture(loader, './assets/earth_day_4k.jpg', 'day', THREE),
    loadTexture(loader, './assets/earth_night_4k.jpg', 'night', THREE),
    loadTexture(loader, './assets/earth_normal_4k.jpg', 'normal', THREE),
    loadTexture(loader, './assets/earth_specular_4k.jpg', 'specular', THREE),
    loadTexture(loader, './assets/earth_clouds_4k.png', 'clouds', THREE),
  ]);

  const earthMat = new THREE.MeshStandardMaterial({
    map: dayMap,
    normalMap,
    roughness: 0.72,
    metalness: 0.08,
    roughnessMap: specularMap,
    emissive: 0x0a0f1b,
    emissiveIntensity: 0.14,
  });
  applyNightBlend(earthMat, nightMap, specularMap, sun, THREE);

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.34, 128, 128), earthMat);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.3534, 128, 128),
    new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: 0.42, depthWrite: false, roughness: 1, metalness: 0 })
  );

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.4, 128, 128), makeAtmosphere(THREE));

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0xff7d3a, emissive: 0xff5f2b, emissiveIntensity: 1.3, transparent: true, opacity: 0, roughness: 0.25, metalness: 0.35 })
  );

  const ringGeo = new THREE.BufferGeometry();
  const ringPos = [];
  for (let i = 0; i < 380; i += 1) {
    const angle = (i / 380) * Math.PI * 2;
    const radius = 1.6 + Math.random() * 0.9;
    ringPos.push(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.22, Math.sin(angle) * radius);
  }
  ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPos, 3));
  const pulseRing = new THREE.Points(
    ringGeo,
    new THREE.PointsMaterial({ color: 0x8ec8ff, size: 0.03, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  );

  group.add(earth, clouds, atmosphere, core, pulseRing);

  function intro(camera, ambient, hemi) {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    camera.position.set(0.2, 0.35, 12.8);
    group.rotation.set(0.3, -1.9, 0.08);
    group.scale.set(0.8, 0.8, 0.8);
    ambient.intensity = 0.05;
    hemi.intensity = 0.1;

    tl.to(camera.position, { z: 7.4, duration: 2.2 }, 0)
      .to(group.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 2.2 }, 0)
      .to(group.rotation, { y: -0.4, duration: 2.6 }, 0)
      .to(camera.position, { x: 2.9, z: 6.4, duration: 2.1 }, 0.8)
      .to(camera.position, { x: 0, y: 0.2, z: 5.7, duration: 2.0 }, 2.6)
      .to(ambient, { intensity: 0.4, duration: 2.8 }, 0.1)
      .to(hemi, { intensity: 0.55, duration: 2.8 }, 0.1)
      .to(group.rotation, { x: 0.06, y: -0.33, z: 0, duration: 1.8 }, 2.6);

    return tl;
  }

  function clickBounce() {
    gsap.to(group.scale, { x: 1.06, y: 1.06, z: 1.06, duration: 0.24, ease: 'power2.out', yoyo: true, repeat: 1 });
  }

  function togglePulse(active) {
    gsap.to(earth.material, { emissiveIntensity: active ? 0.42 : 0.14, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(atmosphere.material.uniforms.intensity, { value: active ? 1.35 : 0.85, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(pulseRing.material, { opacity: active ? 0.75 : 0, duration: 0.9, ease: 'sine.inOut' });
  }

  function crackEasterEgg() {
    gsap.timeline()
      .to(core.material, { opacity: 0.92, duration: 0.25, ease: 'power2.out' }, 0)
      .to(earth.scale, { x: 1.1, y: 0.9, z: 1.1, duration: 0.3, ease: 'power2.out' }, 0)
      .to(clouds.material, { opacity: 0.12, duration: 0.24, ease: 'power1.out' }, 0)
      .to(earth.scale, { x: 1, y: 1, z: 1, duration: 0.66, ease: 'power2.inOut' }, 0.34)
      .to(core.material, { opacity: 0, duration: 0.72, ease: 'power2.in' }, 0.48)
      .to(clouds.material, { opacity: 0.42, duration: 0.45, ease: 'power2.inOut' }, 0.55);
  }

  return {
    group,
    earth,
    clouds,
    atmosphere,
    pulseRing,
    updateMaterial() {
      earth.material.userData.updateShader?.();
    },
    intro,
    clickBounce,
    togglePulse,
    crackEasterEgg,
    labelText() {
      return LABELS[Math.floor(Math.random() * LABELS.length)];
    },
  };
}
