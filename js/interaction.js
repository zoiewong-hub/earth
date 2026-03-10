import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

export function createInteractionSystem({ THREE, camera, renderer, setBloomStrength, setFocus, earthSystem, onAutoMode }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const label = document.getElementById('label');

  const state = {
    dragging: false,
    hover: false,
    pulse: false,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
    longPressTimer: null,
    idleTimer: null,
    clickSeries: [],
    parallaxX: 0,
    parallaxY: 0,
    activePointers: new Map(),
    pinchDistance: 0,
  };

  function markActive() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => onAutoMode(true), 10000);
    onAutoMode(false);
  }

  function toNdc(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    state.parallaxX = pointer.x;
    state.parallaxY = pointer.y;
  }

  function pickEarth(event) {
    toNdc(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(earthSystem.earth, false);
    return hit[0] || null;
  }

  function applyZoom(targetZ) {
    const target = Math.max(2.7, Math.min(8.5, targetZ));
    gsap.to(camera.position, { z: target, duration: 0.38, ease: 'power2.out' });
  }

  function updatePinchZoom() {
    if (state.activePointers.size < 2) return;
    const points = [...state.activePointers.values()];
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    const distance = Math.hypot(dx, dy);

    if (!state.pinchDistance) {
      state.pinchDistance = distance;
      return;
    }

    const delta = distance - state.pinchDistance;
    state.pinchDistance = distance;
    const zoomDelta = -delta * 0.006;
    applyZoom(camera.position.z + zoomDelta);
  }

  function onPointerDown(event) {
    markActive();
    state.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.activePointers.size >= 2) {
      state.dragging = false;
      clearTimeout(state.longPressTimer);
      state.pinchDistance = 0;
      return;
    }

    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    clearTimeout(state.longPressTimer);

    if (pickEarth(event)) {
      state.longPressTimer = setTimeout(() => {
        state.pulse = !state.pulse;
        earthSystem.togglePulse(state.pulse);
      }, 1500);
    }
  }

  function onPointerMove(event) {
    if (state.activePointers.has(event.pointerId)) {
      state.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const hit = pickEarth(event);

    if (hit && !state.hover) {
      state.hover = true;
      gsap.to({ value: 0.42 }, { value: 0.68, duration: 0.4, ease: 'sine.inOut', onUpdate() { setBloomStrength(this.targets()[0].value); } });
      gsap.to({}, { duration: 0.6, onStart: () => setFocus(3.5) });
    } else if (!hit && state.hover) {
      state.hover = false;
      gsap.to({ value: 0.68 }, { value: 0.42, duration: 0.4, ease: 'sine.inOut', onUpdate() { setBloomStrength(this.targets()[0].value); } });
      gsap.to({}, { duration: 0.6, onStart: () => setFocus(3.8) });
    }

    if (state.activePointers.size >= 2) {
      markActive();
      updatePinchZoom();
      return;
    }

    if (!state.dragging) return;
    markActive();

    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    state.velocityX = dx * 0.001;
    state.velocityY = dy * 0.0008;

    const dragSpeed = Math.hypot(dx, dy);
    if (dragSpeed > 38) {
      state.velocityX *= 1.35;
      state.velocityY *= 1.2;
    }

    earthSystem.group.rotation.y += state.velocityX;
    earthSystem.group.rotation.x += state.velocityY;
    earthSystem.group.rotation.x = Math.max(-0.8, Math.min(0.8, earthSystem.group.rotation.x));
  }

  function onPointerUp(event) {
    clearTimeout(state.longPressTimer);
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size < 2) {
      state.pinchDistance = 0;
    }
    state.dragging = false;
  }

  function showLabel(point, text) {
    const pos = point.clone().project(camera);
    label.textContent = text;
    label.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`;
    label.style.top = `${(-pos.y * 0.5 + 0.5) * window.innerHeight}px`;
    label.hidden = false;
    label.classList.add('show');
    clearTimeout(label._timer);
    label._timer = setTimeout(() => label.classList.remove('show'), 1600);
  }

  function onClick(event) {
    markActive();
    const hit = pickEarth(event);
    if (!hit) return;

    earthSystem.clickBounce();
    earthSystem.triggerOrbitalBelt?.();
    earthSystem.spawnImpact?.(hit.point);
    if (event.shiftKey) earthSystem.spawnBeacon?.(hit.point);
    const mappedLabel = earthSystem.getLocationLabel?.(hit.point) || earthSystem.labelText();
    showLabel(hit.point, event.shiftKey ? "Beacon Placed" : mappedLabel);

    const now = performance.now();
    state.clickSeries = state.clickSeries.filter((t) => now - t < 1600);
    state.clickSeries.push(now);
    if (state.clickSeries.length >= 5) {
      state.clickSeries = [];
      earthSystem.crackEasterEgg();
    }
  }

  function onDblClick(event) {
    markActive();
    if (!pickEarth(event)) return;
    gsap.to(camera.position, { z: 3.2, y: 0.16, duration: 1.05, ease: 'power2.inOut', yoyo: true, repeat: 1 });
    gsap.to({}, { duration: 2.1, onStart: () => setFocus(3.2), onComplete: () => setFocus(3.8) });
    earthSystem.triggerPlayfulMode?.();
  }

  function onWheel(event) {
    markActive();
    const delta = Math.sign(event.deltaY) * 0.35;
    applyZoom(camera.position.z + delta);
  }


  function onKeyDown(event) {
    if (event.key.toLowerCase() === 'm') {
      markActive();
      earthSystem.triggerMeteorShower?.();
      return;
    }
    if (event.key.toLowerCase() === 'c') {
      markActive();
      earthSystem.triggerCityPulse?.();
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      markActive();
      earthSystem.triggerScanSweep?.();
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      markActive();
      gsap.to(camera.position, { x: 0, y: 0.2, z: 5.7, duration: 0.9, ease: 'power2.inOut' });
      gsap.to(earthSystem.group.rotation, { x: 0.06, y: -0.33, z: 0, duration: 1.0, ease: 'power2.inOut' });
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('dblclick', onDblClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  markActive();

  return {
    update() {
      if (!state.dragging && state.activePointers.size < 2) {
        earthSystem.group.rotation.y += state.velocityX;
        earthSystem.group.rotation.x += state.velocityY;
        state.velocityX *= 0.965;
        state.velocityY *= 0.94;
      }

      earthSystem.group.rotation.x = Math.max(-0.8, Math.min(0.8, earthSystem.group.rotation.x));

      if (state.pulse) {
        earthSystem.pulseRing.rotation.y += 0.004;
      }

      camera.position.x += ((state.parallaxX * 0.18) - camera.position.x * 0.08) * 0.04;
      camera.position.y += ((state.parallaxY * 0.1 + 0.2) - camera.position.y) * 0.04;
    },
  };
}
