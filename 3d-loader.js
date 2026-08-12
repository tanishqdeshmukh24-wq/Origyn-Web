/* Loads the isolated Three.js story as an ES module without changing the existing app scripts. */
import("./3d-scene.js?v=3").catch(error => console.error("Origyn 3D failed to load:", error));
