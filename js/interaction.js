import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

export function createInteractionSystem({ THREE, camera, renderer, setBloomStrength, earthSystem, onAutoMode }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const label = document.getElementById('label');
  const state = {
    drag: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    hover: false,
    pulse: false,
    longPressTimer: null,
    clickTimes: [],
    idleTimer: null,
  };

  function setIdleWatcher() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => onAutoMode(true), 10000);
    onAutoMode(false);
  }

  function projectLabel(point) {
    const pos = point.clone().project(camera);
    label.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`;
    label.style.top = `${(-pos.y * 0.5 + 0.5) * window.innerHeight}px`;
  }

  function pointerToNdc(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function earthHit(event) {
    pointerToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(earthSystem.earth, false);
    return hit[0] || null;
  }

  function onPointerDown(e) {
    setIdleWatcher();
    state.drag = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    const hit = earthHit(e);
    clearTimeout(state.longPressTimer);
    if (hit) {
      state.longPressTimer = setTimeout(() => {
        state.pulse = !state.pulse;
        earthSystem.togglePulse(state.pulse);
      }, 1500);
    }
  }

  function onPointerMove(e) {
    const hit = earthHit(e);
    if (hit && !state.hover) {
      state.hover = true;
      gsap.to({}, { duration: 0.4, onUpdate: () => setBloomStrength(0.58), ease: 'sine.inOut' });
    }
    if (!hit && state.hover) {
      state.hover = false;
      gsap.to({}, { duration: 0.4, onUpdate: () => setBloomStrength(0.34), ease: 'sine.inOut' });
    }

    if (!state.drag) return;
    setIdleWatcher();
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.velX = dx * 0.0009;
    state.velY = dy * 0.0007;
    earthSystem.group.rotation.y += state.velX;
    earthSystem.group.rotation.x += state.velY;
  }

  function onPointerUp() {
    clearTimeout(state.longPressTimer);
    state.drag = false;
  }

  function onClick(e) {
    setIdleWatcher();
    const hit = earthHit(e);
    if (!hit) {
      label.classList.remove('show');
      return;
    }

    earthSystem.clickBounce();

    label.textContent = earthSystem.labelText();
    projectLabel(hit.point);
    label.hidden = false;
    label.classList.add('show');
    clearTimeout(label._timer);
    label._timer = setTimeout(() => label.classList.remove('show'), 1600);

    const now = performance.now();
    state.clickTimes = state.clickTimes.filter((t) => now - t < 1800);
    state.clickTimes.push(now);
    if (state.clickTimes.length >= 5) {
      state.clickTimes = [];
      earthSystem.crackEasterEgg();
    }
  }

  function onDblClick(e) {
    setIdleWatcher();
    if (!earthHit(e)) return;
    gsap.to(camera.position, { z: 3.4, y: 0.15, duration: 1, ease: 'power2.inOut', yoyo: true, repeat: 1 });
  }

  function onWheel(e) {
    setIdleWatcher();
    const delta = Math.sign(e.deltaY) * 0.35;
    const target = Math.max(2.7, Math.min(8, camera.position.z + delta));
    gsap.to(camera.position, { z: target, duration: 0.55, ease: 'power2.inOut' });
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('dblclick', onDblClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  setIdleWatcher();

  function update() {
    if (!state.drag) {
      earthSystem.group.rotation.y += state.velX;
      earthSystem.group.rotation.x += state.velY;
      state.velX *= 0.96;
      state.velY *= 0.94;
    }
    if (state.pulse) {
      earthSystem.pulseParticles.rotation.y += 0.004;
      earthSystem.pulseParticles.rotation.x += 0.002;
    }
  }

  return { update };
}
