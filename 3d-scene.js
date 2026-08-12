/* =========================================================
   ORIGYN — 3D STORY
   Scroll-controlled, isolated from marketplace/cart/checkout logic.
   The story locks page scrolling while it is being completed.
========================================================= */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

const root = document.querySelector(".delivery-scene");
const canvas = document.getElementById("origyn-3d-canvas");

if (!root || !canvas) {
  console.warn("Origyn 3D: story canvas not found.");
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 3.1, 11.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9c9d8, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.PointLight(0x6c63ff, 16, 18, 2);
  rim.position.set(4, 4, 3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 16),
    new THREE.MeshStandardMaterial({ color: 0xf1f1f3, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.08, 4.8),
    new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.88 })
  );
  road.position.y = 0.04;
  road.receiveShadow = true;
  world.add(road);

  /* ---------- stylized human character ---------- */
  const person = new THREE.Group();
  person.position.set(-5.0, 0, 0);
  world.add(person);

  const uniform = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.58 });
  const uniformLight = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.55 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98968, roughness: 0.72 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.48 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x6c63ff, roughness: 0.35, metalness: 0.12 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.18, 8, 18), uniform);
  torso.position.y = 2.0;
  torso.scale.set(0.95, 1, 0.72);
  torso.castShadow = true;
  person.add(torso);

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.06), accent);
  shirt.position.set(0, 2.23, 0.38);
  shirt.castShadow = true;
  person.add(shirt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.24, 16), skin);
  neck.position.y = 2.78;
  person.add(neck);

  const head = new THREE.Group();
  head.position.y = 3.18;
  person.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 18), skin);
  face.scale.set(0.92, 1.06, 0.9);
  face.castShadow = true;
  head.add(face);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), uniform);
  hair.position.y = 0.12;
  hair.scale.set(1.03, 0.9, 1.02);
  head.add(hair);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-0.15, 0.15].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeMat);
    eye.position.set(x, 0.02, 0.405);
    head.add(eye);
  });

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.018, 8, 18, Math.PI), eyeMat);
  smile.position.set(0, -0.13, 0.397);
  smile.rotation.z = Math.PI;
  head.add(smile);

  const hip = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.48, 8, 16), uniformLight);
  hip.position.y = 1.05;
  hip.castShadow = true;
  person.add(hip);

  function limb(radius, length, material) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 7, 12), material);
    m.position.y = -length * 0.5;
    m.castShadow = true;
    g.add(m);
    return g;
  }

  const upperArmL = limb(0.14, 0.68, uniform);
  const upperArmR = limb(0.14, 0.68, uniform);
  upperArmL.position.set(-0.58, 2.35, 0);
  upperArmR.position.set(0.58, 2.35, 0);
  person.add(upperArmL, upperArmR);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), skin);
  const handR = handL.clone();
  handL.position.set(-0.58, 1.55, 0);
  handR.position.set(0.58, 1.55, 0);
  person.add(handL, handR);

  const legL = limb(0.17, 0.88, uniform);
  const legR = limb(0.17, 0.88, uniform);
  legL.position.set(-0.23, 1.0, 0);
  legR.position.set(0.23, 1.0, 0);
  person.add(legL, legR);

  function makeShoe() {
    const g = new THREE.Group();
    const main = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.72), shoe);
    main.position.z = 0.12;
    main.castShadow = true;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.74), sole);
    s.position.set(0, -0.11, 0.12);
    g.add(main, s);
    return g;
  }
  const shoeL = makeShoe(), shoeR = makeShoe();
  shoeL.position.set(-0.23, 0.16, 0.16);
  shoeR.position.set(0.23, 0.16, 0.16);
  person.add(shoeL, shoeR);

  /* ---------- package ---------- */
  const box = new THREE.Group();
  box.position.set(-3.55, 1.25, 0.42);
  world.add(box);
  const parcel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.92, 0.92), new THREE.MeshStandardMaterial({ color: 0xb8783f, roughness: 0.78 }));
  parcel.castShadow = true;
  box.add(parcel);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.95), new THREE.MeshStandardMaterial({ color: 0xe8d8b6, roughness: 0.55 }));
  box.add(tape);

  /* ---------- rock ---------- */
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), new THREE.MeshStandardMaterial({ color: 0x77777b, roughness: 1 }));
  rock.position.set(1.05, 0.53, 0.15);
  rock.scale.set(1.2, 0.8, 0.9);
  rock.castShadow = true;
  world.add(rock);

  /* ---------- ORIGYN letter reveal ---------- */
  const revealGroup = new THREE.Group();
  revealGroup.position.set(2.6, 2.25, 0);
  world.add(revealGroup);
  const letters = [];
  const fontCanvas = document.createElement("canvas");
  fontCanvas.width = 1024;
  fontCanvas.height = 256;
  const ctx = fontCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.font = "900 190px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ORIGYN", 512, 130);
  const texture = new THREE.CanvasTexture(fontCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(5.7, 1.43),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 })
  );
  revealGroup.add(label);

  /* Individual letter blocks give the reveal physical depth. */
  const letterChars = "ORIGYN";
  const letterMats = [0x6c63ff, 0x111111, 0x6c63ff, 0x111111, 0x6c63ff, 0x111111];
  letterChars.split("").forEach((char, i) => {
    const c = document.createElement("canvas");
    c.width = 180; c.height = 220;
    const cctx = c.getContext("2d");
    cctx.fillStyle = "white";
    cctx.font = "900 180px Arial";
    cctx.textAlign = "center";
    cctx.textBaseline = "middle";
    cctx.fillText(char, 90, 112);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.0), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0 }));
    mesh.position.set((i - 2.5) * 0.82, 0, 0.25);
    mesh.scale.setScalar(0.001);
    revealGroup.add(mesh);
    letters.push(mesh);
  });

  const state = { progress: 0, target: 0, locked: false };
  let last = performance.now();
  let lastTouchY = null;
  let wheelAccumulator = 0;

  function resize() {
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function storyProgress() {
    const rect = root.getBoundingClientRect();
    const viewport = window.innerHeight;
    const start = viewport * 0.82;
    const end = -root.offsetHeight + viewport * 0.18;
    return THREE.MathUtils.clamp((start - rect.top) / Math.max(start - end, 1), 0, 1);
  }

  function setPageLock(locked) {
    if (state.locked === locked) return;
    state.locked = locked;
    document.body.style.overflow = locked ? "hidden" : "";
    root.classList.toggle("story-animating", locked);
  }

  function onWheel(event) {
    const rect = root.getBoundingClientRect();
    const inStory = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
    if (!inStory && !state.locked) return;

    if (!state.locked) {
      state.progress = storyProgress();
      state.target = state.progress;
      if ((event.deltaY > 0 && state.progress < 0.98) || (event.deltaY < 0 && state.progress > 0.02)) {
        setPageLock(true);
      }
    }

    if (state.locked) {
      event.preventDefault();
      wheelAccumulator += event.deltaY;
      const delta = THREE.MathUtils.clamp(wheelAccumulator / 1400, -0.12, 0.12);
      if (Math.abs(delta) > 0.001) {
        state.target = THREE.MathUtils.clamp(state.target + delta, 0, 1);
        wheelAccumulator *= 0.25;
      }
      if (state.target >= 0.999 && event.deltaY > 0) {
        state.progress = 1;
        state.target = 1;
        setPageLock(false);
        window.scrollBy({ top: Math.max(root.offsetHeight * 0.72, 1), behavior: "smooth" });
      } else if (state.target <= 0.001 && event.deltaY < 0) {
        state.progress = 0;
        state.target = 0;
        setPageLock(false);
        window.scrollBy({ top: -Math.max(root.offsetHeight * 0.72, 1), behavior: "smooth" });
      }
    }
  }

  function onTouchStart(e) { lastTouchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!state.locked || lastTouchY == null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    state.target = THREE.MathUtils.clamp(state.target + (lastTouchY - y) / 900, 0, 1);
    lastTouchY = y;
  }
  function onTouchEnd() { lastTouchY = null; }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("resize", resize, { passive: true });

  function animateScene(time) {
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;
    state.progress = THREE.MathUtils.damp(state.progress, state.target, 7.5, dt);
    const p = state.progress;

    const walk = THREE.MathUtils.smoothstep(Math.min(p / 0.32, 1), 0, 1);
    const trip = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p - 0.32) / 0.17, 0, 1), 0, 1);
    const fall = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p - 0.40) / 0.13, 0, 1), 0, 1);
    const rise = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p - 0.53) / 0.12, 0, 1), 0, 1);
    const reveal = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p - 0.62) / 0.38, 0, 1), 0, 1);

    const vibe = Math.sin(time * 0.006) * 0.035 * walk * (1 - trip);
    person.position.x = THREE.MathUtils.lerp(-5.0, -1.55, walk) + Math.sin(p * 18) * 0.08 * trip;
    person.position.y = vibe - 0.28 * fall + 0.28 * rise;
    person.rotation.z = THREE.MathUtils.lerp(0, -1.18, trip) + Math.sin(p * 34) * 0.08 * trip;
    person.rotation.y = Math.sin(time * 0.003) * 0.08 * walk;
    head.rotation.z = Math.sin(time * 0.004) * 0.035 * walk;
    torso.rotation.z = Math.sin(time * 0.005) * 0.025 * walk;

    const stride = Math.sin(time * 0.014) * 0.48 * walk * (1 - trip);
    legL.rotation.z = stride;
    legR.rotation.z = -stride;
    upperArmL.rotation.z = -stride * 0.7 - 0.25;
    upperArmR.rotation.z = stride * 0.7 + 0.25;
    handL.position.y = 1.55 - stride * 0.25;
    handR.position.y = 1.55 + stride * 0.25;

    if (trip > 0) {
      upperArmL.rotation.x = -0.8 * trip;
      upperArmR.rotation.x = 0.9 * trip;
    }

    shoeL.rotation.z = stride * 0.7;
    shoeR.rotation.z = -stride * 0.7;

    /* parcel leaves his hands, arcs, spins, then settles near the reveal */
    const throwT = THREE.MathUtils.clamp((p - 0.34) / 0.25, 0, 1);
    box.position.x = THREE.MathUtils.lerp(-3.55, 1.45, THREE.MathUtils.smoothstep(throwT, 0, 1));
    box.position.y = 1.25 + Math.sin(throwT * Math.PI) * 2.25 - throwT * 0.85;
    box.position.z = 0.42 + Math.sin(throwT * Math.PI) * 0.65;
    box.rotation.x = throwT * Math.PI * 2.1;
    box.rotation.z = throwT * Math.PI * 1.5;

    rock.rotation.y = p * 0.9;
    rock.rotation.z = Math.sin(p * 25) * 0.08 * trip;

    revealGroup.position.y = 2.25 + Math.sin(time * 0.002) * 0.08 * reveal;
    label.material.opacity = 0;
    letters.forEach((mesh, i) => {
      const local = THREE.MathUtils.clamp((reveal - i * 0.07) / 0.38, 0, 1);
      const e = THREE.MathUtils.smoothstep(local, 0, 1);
      mesh.material.opacity = e;
      mesh.scale.setScalar(Math.max(0.001, e));
      mesh.position.y = Math.sin((i + 1) * 1.8 + p * 12) * 0.32 * (1 - e) + Math.sin(time * 0.002 + i) * 0.05 * e;
      mesh.rotation.z = (1 - e) * ((i % 2 ? -1 : 1) * 0.9) + Math.sin(time * 0.002 + i) * 0.04 * e;
      mesh.position.z = 0.25 + Math.sin(i * 1.7) * (1 - e) * 0.8;
    });

    camera.position.x = THREE.MathUtils.lerp(0, 0.65, reveal);
    camera.position.y = THREE.MathUtils.lerp(3.1, 3.55, reveal);
    camera.position.z = THREE.MathUtils.lerp(11.5, 10.2, reveal);
    camera.lookAt(0.3, 1.65, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(animateScene);
  }

  resize();
  state.target = storyProgress();
  requestAnimationFrame(animateScene);
  console.log("Origyn 3D story loaded — scroll-locked cinematic timeline active.");
}
