/* =========================================================
   ORIGYN — PROCEDURAL THREE.JS STORY SCENE
   Phase 1: delivery scene foundation.
   No external 3D model files required yet.
========================================================= */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
import { RoundedBoxGeometry } from "https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/geometries/RoundedBoxGeometry.js";

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
  camera.position.set(0, 3.2, 11.5);
  camera.lookAt(0, 1.5, 0);

  const ambient = new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 2.3);
  scene.add(ambient);

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

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 16),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.92, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  world.add(floor);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.08, 4.8),
    new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.9 })
  );
  road.position.set(0, 0.04, 0);
  road.receiveShadow = true;
  world.add(road);

  const lane = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.025, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  lane.position.set(0, 0.09, 0);
  world.add(lane);

  const person = new THREE.Group();
  person.position.set(-4.6, 0, 0);
  world.add(person);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c7a7, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.75 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.15, 8, 16), bodyMat);
  body.position.y = 2.0;
  body.castShadow = true;
  person.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), skinMat);
  head.position.y = 3.1;
  head.castShadow = true;
  person.add(head);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), bodyMat);
  cap.position.y = 3.2;
  cap.castShadow = true;
  person.add(cap);

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.72, 6, 10), bodyMat);
  arm.position.set(0.56, 2.05, 0);
  arm.rotation.z = -0.45;
  arm.castShadow = true;
  person.add(arm);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 6, 10), bodyMat);
  legL.position.set(-0.22, 0.85, 0);
  legL.rotation.z = 0.08;
  legL.castShadow = true;
  person.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.22;
  legR.rotation.z = -0.08;
  person.add(legR);

  const shoeL = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.18, 0.62, 4, 0.06), shoeMat);
  shoeL.position.set(-0.22, 0.23, 0.13);
  shoeL.castShadow = true;
  person.add(shoeL);

  const shoeR = shoeL.clone();
  shoeR.position.x = 0.22;
  person.add(shoeR);

  const box = new THREE.Group();
  box.position.set(-2.9, 0.65, 0);
  world.add(box);

  const boxMat = new THREE.MeshStandardMaterial({ color: 0xb8783f, roughness: 0.78 });
  const parcel = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.05, 1.25, 5, 0.08), boxMat);
  parcel.castShadow = true;
  parcel.receiveShadow = true;
  box.add(parcel);

  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.08, 1.28),
    new THREE.MeshStandardMaterial({ color: 0xe6d7b5, roughness: 0.6 })
  );
  box.add(tape);

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.58, 1),
    new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 1 })
  );
  rock.position.set(1.1, 0.55, 0);
  rock.scale.set(1.2, 0.8, 0.9);
  rock.castShadow = true;
  world.add(rock);

  const techGroup = new THREE.Group();
  techGroup.position.set(3.0, 1.9, 0);
  world.add(techGroup);

  const techColors = [0x6c63ff, 0x111111, 0x3b82f6];
  const techLabels = ["AI", "WEB", "IoT"];
  const techMeshes = [];

  techLabels.forEach((label, i) => {
    const card = new THREE.Mesh(
      new RoundedBoxGeometry(1.25, 1.25, 0.18, 6, 0.08),
      new THREE.MeshStandardMaterial({ color: techColors[i], roughness: 0.35, metalness: 0.12 })
    );
    card.position.set((i - 1) * 1.45, i === 1 ? 0.15 : 0, 0);
    card.rotation.z = (i - 1) * 0.08;
    card.scale.setScalar(0.001);
    card.castShadow = true;
    techGroup.add(card);
    techMeshes.push(card);
  });

  const state = { progress: 0, target: 0, active: false };
  let last = performance.now();

  function resize() {
    const width = Math.max(root.clientWidth, 1);
    const height = Math.max(root.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateScrollTarget() {
    const rect = root.getBoundingClientRect();
    const viewport = window.innerHeight;
    const travel = Math.max(viewport + root.offsetHeight, 1);
    const raw = (viewport - rect.top) / travel;
    state.target = THREE.MathUtils.clamp((raw - 0.05) / 0.72, 0, 1);
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
    arm.rotation.z = -0.45 - step * 1.5;

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

  const observer = new IntersectionObserver(entries => {
    state.active = entries.some(entry => entry.isIntersecting);
  }, { threshold: 0.01 });
  observer.observe(root);

  requestAnimationFrame(animateScene);
  console.log("Origyn 3D phase 1 loaded — procedural delivery scene ready.");
}
