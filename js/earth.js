import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const LABELS = ['Pacific Rim', 'Atlantic Glow', 'Aurora Band', 'Equatorial Stream', 'Polar Crown'];

const REMOTE_TEXTURES = {
  day: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r162/examples/textures/planets/earth_atmos_2048.jpg',
  night: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r162/examples/textures/planets/earth_lights_2048.png',
  normal: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r162/examples/textures/planets/earth_normal_2048.jpg',
  specular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r162/examples/textures/planets/earth_specular_2048.jpg',
  clouds: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r162/examples/textures/planets/earth_clouds_1024.png',
};

function makeCanvas(width = 2048, height = 1024) {
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
    g.addColorStop(0, '#3b7cc0');
    g.addColorStop(0.5, '#0e3e75');
    g.addColorStop(1, '#092a52');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 3) {
      for (let x = 0; x < canvas.width; x += 3) {
        const n = Math.sin(x * 0.009) + Math.cos(y * 0.014) + Math.sin((x + y) * 0.006);
        if (n > 1.3) {
          const shade = 70 + Math.floor(((n - 1.3) / 1.7) * 80);
          ctx.fillStyle = `rgba(${55 + shade * 0.45},${90 + shade * 0.6},${46 + shade * 0.3},0.7)`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }
  }

  if (type === 'night') {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#05070f');
    g.addColorStop(1, '#0c1a30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5000; i += 1) {
      const a = Math.random() * 0.6;
      const s = 0.5 + Math.random() * 1.6;
      ctx.fillStyle = `rgba(255,202,118,${a})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, s, s);
    }
  }

  if (type === 'normal') {
    ctx.fillStyle = 'rgb(128,128,255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (type === 'specular') {
    ctx.fillStyle = '#cbd9ef';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = `rgba(30,42,58,${0.08 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 20 + Math.random() * 120, 10 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (type === 'clouds') {
    for (let i = 0; i < 1800; i += 1) {
      ctx.fillStyle = `rgba(245,250,255,${0.04 + Math.random() * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 12 + Math.random() * 70, 6 + Math.random() * 35, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

function loadImageTexture(loader, url, type, THREE) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = type === 'normal' || type === 'specular' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`load failed: ${url}`))
    );
  });
}

async function loadTexture(loader, localPath, remoteUrl, type, THREE) {
  try {
    return await loadImageTexture(loader, localPath, type, THREE);
  } catch {
    try {
      return await loadImageTexture(loader, remoteUrl, type, THREE);
    } catch {
      const texture = new THREE.CanvasTexture(buildFallback(type));
      texture.colorSpace = type === 'normal' || type === 'specular' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    }
  }
}

function makeAtmosphere(THREE, sunRef) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      sunDirection: { value: new THREE.Vector3(1, 0.4, 0.5).normalize() },
      glowColorA: { value: new THREE.Color(0x88c7ff) },
      glowColorB: { value: new THREE.Color(0x2b62c7) },
      intensity: { value: 0.95 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform vec3 glowColorA;
      uniform vec3 glowColorB;
      uniform float intensity;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0), 3.4);
        float sunFacing = max(dot(normalize(vWorldNormal), normalize(sunDirection)), 0.0);
        vec3 glow = mix(glowColorB, glowColorA, 0.35 + sunFacing * 0.65);
        float alpha = fresnel * (0.12 + sunFacing * 0.24) * intensity;
        gl_FragColor = vec4(glow, alpha);
      }
    `,
  });

  material.userData.updateSun = () => {
    material.uniforms.sunDirection.value.copy(sunRef.position).normalize();
  };

  return material;
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
      float nightFactor = smoothstep(0.18, -0.2, nDotL);
      vec3 nightColor = texture2D(nightMap, vMapUv).rgb;
      totalEmissiveRadiance += nightColor * nightFactor * 1.25;

      float specMaskVal = texture2D(specMask, vMapUv).r;
      float oceanSpec = smoothstep(0.1, 0.95, specMaskVal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfVec = normalize(nSun + viewDir);
      float gloss = pow(max(dot(normalize(vNormal), halfVec), 0.0), 70.0) * oceanSpec * 0.24;
      totalEmissiveRadiance += vec3(0.55, 0.72, 0.95) * gloss;`
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
    loadTexture(loader, './assets/earth_day_4k.jpg', REMOTE_TEXTURES.day, 'day', THREE),
    loadTexture(loader, './assets/earth_night_4k.jpg', REMOTE_TEXTURES.night, 'night', THREE),
    loadTexture(loader, './assets/earth_normal_4k.jpg', REMOTE_TEXTURES.normal, 'normal', THREE),
    loadTexture(loader, './assets/earth_specular_4k.jpg', REMOTE_TEXTURES.specular, 'specular', THREE),
    loadTexture(loader, './assets/earth_clouds_4k.png', REMOTE_TEXTURES.clouds, 'clouds', THREE),
  ]);

  const earthMat = new THREE.MeshStandardMaterial({
    map: dayMap,
    normalMap,
    roughness: 0.7,
    metalness: 0.06,
    roughnessMap: specularMap,
    emissive: 0x081225,
    emissiveIntensity: 0.12,
  });
  applyNightBlend(earthMat, nightMap, specularMap, sun, THREE);

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.34, 128, 128), earthMat);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.3534, 128, 128),
    new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: 0.3, depthWrite: false, roughness: 1, metalness: 0 })
  );

  const atmosphereMaterial = makeAtmosphere(THREE, sun);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.378, 128, 128), atmosphereMaterial);

  const outerAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.405, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0x5ea8ff, transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide })
  );

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

  group.add(earth, clouds, atmosphere, outerAtmosphere, core, pulseRing);

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
    gsap.to(earth.material, { emissiveIntensity: active ? 0.42 : 0.12, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(atmosphere.material.uniforms.intensity, { value: active ? 1.25 : 0.95, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(outerAtmosphere.material, { opacity: active ? 0.08 : 0.045, duration: 1.0, ease: 'sine.inOut' });
    gsap.to(pulseRing.material, { opacity: active ? 0.75 : 0, duration: 0.9, ease: 'sine.inOut' });
  }

  function crackEasterEgg() {
    gsap.timeline()
      .to(core.material, { opacity: 0.92, duration: 0.25, ease: 'power2.out' }, 0)
      .to(earth.scale, { x: 1.1, y: 0.9, z: 1.1, duration: 0.3, ease: 'power2.out' }, 0)
      .to(clouds.material, { opacity: 0.12, duration: 0.24, ease: 'power1.out' }, 0)
      .to(earth.scale, { x: 1, y: 1, z: 1, duration: 0.66, ease: 'power2.inOut' }, 0.34)
      .to(core.material, { opacity: 0, duration: 0.72, ease: 'power2.in' }, 0.48)
      .to(clouds.material, { opacity: 0.3, duration: 0.45, ease: 'power2.inOut' }, 0.55);
  }

  return {
    group,
    earth,
    clouds,
    atmosphere,
    pulseRing,
    updateMaterial() {
      earth.material.userData.updateShader?.();
      atmosphere.material.userData.updateSun?.();
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
