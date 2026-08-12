/* ORIGYN 3D STORY — classic Three.js build, isolated from app functionality. */

const root = document.querySelector('.delivery-scene');
const canvas = document.getElementById('origyn-3d-canvas');

if (root && canvas && window.THREE) {
  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 2.8, 10);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9999aa, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-4,8,6); light.castShadow=true; scene.add(light);

  const world = new THREE.Group(); scene.add(world);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,16), new THREE.MeshStandardMaterial({color:0xe9e9ed,roughness:.9}));
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; world.add(floor);
  const road = new THREE.Mesh(new THREE.BoxGeometry(30,.08,4.8), new THREE.MeshStandardMaterial({color:0x181818,roughness:.85}));
  road.position.y=.04; road.receiveShadow=true; world.add(road);

  const person = new THREE.Group(); person.position.set(-5,0,0); world.add(person);
  const dark = new THREE.MeshStandardMaterial({color:0x202025,roughness:.55});
  const skin = new THREE.MeshStandardMaterial({color:0xc88968,roughness:.7});
  const accent = new THREE.MeshStandardMaterial({color:0x6c63ff,roughness:.35});
  const shoe = new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.45});

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.52,1.05,8,16),dark); torso.position.y=2; torso.scale.z=.72; person.add(torso);
  const hip = new THREE.Mesh(new THREE.CapsuleGeometry(.43,.45,8,14),dark); hip.position.y=1.05; person.add(hip);
  const head = new THREE.Group(); head.position.y=3.18; person.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.43,20,16),skin); face.scale.set(.92,1.06,.9); head.add(face);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.45,20,12,0,Math.PI*2,0,Math.PI*.5),dark); hair.position.y=.12; head.add(hair);
  const eyeMat = new THREE.MeshBasicMaterial({color:0x111111});
  [-.15,.15].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),eyeMat);e.position.set(x,.02,.405);head.add(e);});
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.1,.018,8,18,Math.PI),eyeMat); smile.position.set(0,-.13,.397); smile.rotation.z=Math.PI; head.add(smile);

  function limb(r,len,mat){const g=new THREE.Group();const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,7,12),mat);m.position.y=-len*.5;g.add(m);return g;}
  const armL=limb(.14,.68,dark), armR=limb(.14,.68,dark), legL=limb(.17,.85,dark), legR=limb(.17,.85,dark);
  armL.position.set(-.62,2.48,0); armR.position.set(.62,2.48,0); legL.position.set(-.25,.9,0); legR.position.set(.25,.9,0);
  person.add(armL,armR,legL,legR);
  const shoeL=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.55),shoe), shoeR=shoeL.clone(); shoeL.position.set(0,-.9,.16); shoeR.position.set(0,-.9,.16); legL.add(shoeL); legR.add(shoeR);
  const badge=new THREE.Mesh(new THREE.BoxGeometry(.45,.12,.04),accent); badge.position.set(0,2.2,.39); person.add(badge);

  const box = new THREE.Mesh(new THREE.BoxGeometry(.7,.55,.7),new THREE.MeshStandardMaterial({color:0xc98b4a,roughness:.7})); box.position.set(-3.6,1.3,.4); box.castShadow=true; world.add(box);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.65,1),new THREE.MeshStandardMaterial({color:0x66666b,roughness:1})); rock.position.set(-1.55,.65,.15); rock.castShadow=true; world.add(rock);

  const reveal = new THREE.Group(); reveal.position.set(1.2,2.2,.2); world.add(reveal);
  const letters=[];
  const makeLetter=(char)=>{const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.clearRect(0,0,256,256);x.fillStyle='#6c63ff';x.font='900 190px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(char,128,135);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(.85,1.05),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:0,side:THREE.DoubleSide}));return m;};
  'ORIGYN'.split('').forEach((ch,i)=>{const m=makeLetter(ch);m.position.set((i-2.5)*.88,0,0);m.scale.setScalar(.01);reveal.add(m);letters.push(m);});

  let progress=0,target=0,locked=false,acc=0;
  function resize(){const w=Math.max(root.clientWidth,1),h=Math.max(root.clientHeight,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function inStory(){const r=root.getBoundingClientRect();return r.top<innerHeight*.78&&r.bottom>innerHeight*.22;}
  function lock(v){locked=v;document.body.style.overflow=v?'hidden':'';}
  function wheel(e){if(!inStory()&&!locked)return;if(!locked){lock(true);target=progress;}e.preventDefault();acc+=e.deltaY;target=THREE.MathUtils.clamp(target+THREE.MathUtils.clamp(acc/1200,-.14,.14),0,1);acc*=.18;if(target<=0&&e.deltaY<0){progress=target=0;lock(false);window.scrollBy({top:-root.offsetHeight*.65,behavior:'smooth'});}if(target>=1&&e.deltaY>0){progress=target=1;lock(false);window.scrollBy({top:root.offsetHeight*.65,behavior:'smooth'});}}
  window.addEventListener('wheel',wheel,{passive:false}); window.addEventListener('resize',resize);

  function animate(t){progress=THREE.MathUtils.damp(progress,target,8,.016);const p=progress;
    const walk=THREE.MathUtils.smoothstep(Math.min(p/.34,1),0,1);
    const stumble=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p-.34)/.18,0,1),0,1);
    const fall=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p-.44)/.13,0,1),0,1);
    const rise=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p-.57)/.13,0,1),0,1);
    const show=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p-.66)/.34,0,1),0,1);
    person.position.x=THREE.MathUtils.lerp(-5,-1.9,walk)+Math.sin(p*30)*.1*stumble;
    person.position.y=-.25*fall+.2*rise;
    person.rotation.z=-1.25*stumble+Math.sin(p*35)*.12*stumble;
    head.rotation.z=Math.sin(t*.004)*.04*walk;
    const swing=Math.sin(t*.014)*.5*walk*(1-stumble); legL.rotation.z=swing;legR.rotation.z=-swing;armL.rotation.z=-swing*.7-.25;armR.rotation.z=swing*.7+.25;
    if(stumble){armL.rotation.x=-.8*stumble;armR.rotation.x=.9*stumble;}
    const throwP=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((p-.34)/.3,0,1),0,1);box.position.x=THREE.MathUtils.lerp(-3.5,1.1,throwP);box.position.y=1.25+Math.sin(throwP*Math.PI)*2.1-.8*throwP;box.rotation.x=throwP*6;box.rotation.z=throwP*4;
    rock.rotation.y=p*1.2;
    reveal.position.y=2.15+Math.sin(t*.002)*.08*show;
    letters.forEach((m,i)=>{const q=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((show-i*.08)/.32,0,1),0,1);m.material.opacity=q;m.scale.setScalar(Math.max(.01,q));m.position.y=Math.sin(t*.003+i)*.05*(q)+(1-q)*Math.sin(i+1)*.35;m.rotation.z=(1-q)*(i%2?-.8:.8);});
    camera.position.x=THREE.MathUtils.lerp(0,.7,show);camera.position.y=THREE.MathUtils.lerp(2.8,3.3,show);camera.position.z=THREE.MathUtils.lerp(10,9.2,show);camera.lookAt(.2,1.7,0);renderer.render(scene,camera);requestAnimationFrame(animate);
  }
  resize(); requestAnimationFrame(animate);
} else { console.error('Origyn 3D: Three.js or story canvas missing.'); }
