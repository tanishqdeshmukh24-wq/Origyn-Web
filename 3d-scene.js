/* =========================================================
   ORIGYN — PROCEDURAL THREE.JS STORY SCENE
   Phase 1: stylized 3D delivery character.
========================================================= */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

const root = document.querySelector(".delivery-scene");
const canvas = document.getElementById("origyn-3d-canvas");

if (!root || !canvas) {
  console.warn("Origyn 3D: story canvas not found.");
} else if (canvas.dataset.origynThreeLoaded === "true") {
  console.warn("Origyn 3D: scene already initialized.");
} else {
  canvas.dataset.origynThreeLoaded = "true";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 3.2, 11.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 2.3));

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-4, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const rim = new THREE.PointLight(0x6c63ff, 18, 18, 2);
  rim.position.set(4, 4, 3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);

  const road = new THREE.Mesh(new THREE.BoxGeometry(30, 0.08, 4.8), new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.9 }));
  road.position.y = 0.04;
  road.receiveShadow = true;
  world.add(road);

  const lane = new THREE.Mesh(new THREE.BoxGeometry(30, 0.025, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  lane.position.y = 0.09;
  world.add(lane);

  const person = new THREE.Group();
  person.position.set(-4.6, 0, 0);
  world.add(person);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6c63ff, roughness: 0.35, metalness: 0.08 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c7a7, roughness: 0.72 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.75 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.05, 8, 16), bodyMat);
  body.position.y = 2.0;
  body.scale.set(1, 1.05, 0.8);
  body.castShadow = true;
  person.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.08), accentMat);
  chest.position.set(0, 2.12, 0.43);
  person.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 24, 18), skinMat);
  head.position.y = 3.1;
  head.castShadow = true;
  person.add(head);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), accentMat);
  cap.position.y = 3.22;
  person.add(cap);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.25), accentMat);
  visor.position.set(0, 3.13, 0.34);
  visor.rotation.x = -0.12;
  person.add(visor);

  const eyeGeo = new THREE.SphereGeometry(0.035, 10, 8);
  const eyeL = new THREE.Mesh(eyeGeo, whiteMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.13, 3.08, 0.34);
  eyeR.position.set(0.13, 3.08, 0.34);
  person.add(eyeL, eyeR);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.0, 0.32), accentMat);
  backpack.position.set(0, 2.05, -0.42);
  backpack.castShadow = true;
  person.add(backpack);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.72, 6, 10), bodyMat);
  const armR = armL.clone();
  armL.position.set(-0.56, 2.05, 0);
  armR.position.set(0.56, 2.05, 0);
  armL.rotation.z = 0.45;
  armR.rotation.z = -0.45;
  person.add(armL, armR);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skinMat);
  const handR = handL.clone();
  handL.position.set(-0.83, 1.73, 0);
  handR.position.set(0.83, 1.73, 0);
  person.add(handL, handR);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 6, 10), bodyMat);
  const legR = legL.clone();
  legL.position.set(-0.22, 0.85, 0);
  legR.position.set(0.22, 0.85, 0);
  legL.rotation.z = 0.08;
  legR.rotation.z = -0.08;
  person.add(legL, legR);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.62), shoeMat);
  const shoeR = shoeL.clone();
  shoeL.position.set(-0.22, 0.23, 0.13);
  shoeR.position.set(0.22, 0.23, 0.13);
  person.add(shoeL, shoeR);

  const box = new THREE.Group();
  box.position.set(-2.9, 0.65, 0);
  world.add(box);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xb8783f, roughness: 0.78 });
  const parcel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1.25), boxMat);
  parcel.castShadow = true;
  parcel.receiveShadow = true;
  box.add(parcel);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.08, 1.28), new THREE.MeshStandardMaterial({ color: 0xe6d7b5, roughness: 0.6 }));
  box.add(tape);

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 1 }));
  rock.position.set(1.1, 0.55, 0);
  rock.scale.set(1.2, 0.8, 0.9);
  rock.castShadow = true;
  world.add(rock);

  const techGroup = new THREE.Group();
  techGroup.position.set(3.0, 1.9, 0);
  world.add(techGroup);
  const techColors = [0x6c63ff, 0x111111, 0x3b82f6];
  const techMeshes = [];

  ["AI", "WEB", "IoT"].forEach((label, i) => {
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.18), new THREE.MeshStandardMaterial({ color: techColors[i], roughness: 0.35, metalness: 0.12 }));
    card.position.set((i - 1) * 1.45, i === 1 ? 0.15 : 0, 0);
    card.rotation.z = (i - 1) * 0.08;
    card.scale.setScalar(0.001);
    techGroup.add(card);
    techMeshes.push(card);
  });

  const state = { progress: 0, target: 0 };
  let last = performance.now();

  function resize() {
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /* Map the story animation to the actual story section instead of the
     previous viewport formula, which started the sequence halfway through. */
  function updateScrollTarget() {
    const rect = root.getBoundingClientRect();
    const viewport = window.innerHeight;
    const start = viewport * 0.82;
    const end = -root.offsetHeight + viewport * 0.18;
    const span = Math.max(start - end, 1);
    state.target = THREE.MathUtils.clamp((start - rect.top) / span, 0, 1);
  }

  function animateScene(time) {
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;
    state.progress = THREE.MathUtils.damp(state.progress, state.target, 5.5, dt);

    const p = state.progress;
    const walk = THREE.MathUtils.smoothstep(Math.min(p / 0.38, 1), 0, 1);
    const impact = THREE.MathUtils.smoothstep(Math.max((p - 0.34) / 0.16, 0), 0, 1);
    const reveal = THREE.MathUtils.smoothstep(Math.max((p - 0.56) / 0.44, 0), 0, 1);

    person.position.x = THREE.MathUtils.lerp(-4.6, -2.25, walk);
    const step = Math.sin(time * 0.012) * 0.13 * walk * (1 - impact);
    legL.rotation.z = 0.08 + step;
    legR.rotation.z = -0.08 - step;
    armL.rotation.z = 0.45 - step * 1.5;
    armR.rotation.z = -0.45 - step * 1.5;
    handL.position.x = -0.83 - step * 0.15;
    handR.position.x = 0.83 + step * 0.15;
    person.position.y = Math.sin(time * 0.024) * 0.035 * walk * (1 - impact);
    person.rotation.z = Math.sin(time * 0.012) * 0.018 * walk;

    box.position.x = THREE.MathUtils.lerp(-2.9, -0.15, impact);
    box.rotation.z = THREE.MathUtils.lerp(0, -0.16, impact);
    rock.rotation.y += dt * 0.25;

    techMeshes.forEach((mesh, i) => {
      const local = THREE.MathUtils.clamp((reveal - i * 0.13) / 0.45, 0, 1);
      const eased = THREE.MathUtils.smoothstep(local, 0, 1);
      mesh.scale.setScalar(Math.max(0.001, eased));
      mesh.position.y = (i === 1 ? 0.15 : 0) + Math.sin(time * 0.002 + i) * 0.08 * eased;
      mesh.rotation.y = THREE.MathUtils.lerp(0.7, 0, eased);
    });

    camera.position.x = THREE.MathUtils.lerp(0, 0.35, reveal);
    camera.position.y = THREE.MathUtils.lerp(3.2, 3.45, reveal);
    camera.lookAt(0, 1.55, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animateScene);
  }

  resize();
  updateScrollTarget();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScrollTarget, { passive: true });
  requestAnimationFrame(animateScene);
  console.log("Origyn 3D loaded successfully.");
}
