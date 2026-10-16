import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const rnd=(a,b)=>a+Math.random()*(b-a);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.6;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.3,6000);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
const sunDir=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(55),THREE.MathUtils.degToRad(140));
const sky=new THREE.Mesh(new THREE.SphereGeometry(2500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sd:{value:sunDir}},
 vertexShader:`varying vec3 vW;void main(){vW=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vW;uniform vec3 sd;void main(){float h=max(vW.y,0.);vec3 c=mix(vec3(.78,.85,.93),vec3(.25,.48,.85),pow(h,.6));float s=max(dot(vW,normalize(sd)),0.);c+=vec3(1.,.9,.7)*(pow(s,600.)*4.+pow(s,8.)*.25);gl_FragColor=vec4(c,1.);}`}));
sky.frustumCulled=false;scene.add(sky);
scene.fog=new THREE.Fog(0xc4d2e2,400,2200);
scene.add(new THREE.HemisphereLight(0xcfe3ff,0x4a4a40,0.6));
const sun=new THREE.DirectionalLight(0xfff1dd,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:900});sun.shadow.bias=-0.0005;scene.add(sun,sun.target);
// ---------- textures ----------
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep)t.repeat.set(...rep);return t}
const asphalt=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#3a3b3e';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=40+Math.random()*50|0;g.fillStyle=`rgb(${v},${v},${v+3})`;g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5)}g.strokeStyle='#2a2a2c';for(let i=0;i<6;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd(-20,20);y+=rnd(-20,20);g.lineTo(x,y)}g.stroke()}},[120,120]);
const paving=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#9a9790';g.fillRect(0,0,w,h);g.strokeStyle='#7c7a74';g.lineWidth=2;for(let i=0;i<=w;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.moveTo(0,i);g.lineTo(w,i);g.stroke()}for(let i=0;i<1500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.08})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}});
const facades=[ // [draw fn, window cell size in m]
 (g,w,h)=>{g.fillStyle='#5b7b98';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){const v=Math.random()*30;g.fillStyle=`rgb(${60+v},${100+v},${140+v})`;g.fillRect(x+1,y+1,30,29)}g.fillStyle='#cfd8e0';for(let y=0;y<h;y+=32)g.fillRect(0,y+29,w,3)},
 (g,w,h)=>{g.fillStyle='#8a4b38';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){g.fillStyle='#e8e0d0';g.fillRect(x+7,y+5,18,22);g.fillStyle=Math.random()<.3?'#f6dca0':'#2c3440';g.fillRect(x+9,y+7,14,18)}},
 (g,w,h)=>{g.fillStyle='#c9c4b8';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){g.fillStyle='#2b3a48';g.fillRect(0,y+8,w,16);g.fillStyle='#bab4a6';for(let x=0;x<w;x+=32)g.fillRect(x,y+8,3,16)}},
 (g,w,h)=>{g.fillStyle='#d8dde2';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=16){g.fillStyle=Math.random()<.15?'#9ab':'#3a4c5e';g.fillRect(x+3,y+3,10,26)}},
].map(f=>canvasTex(256,256,f));
// ---------- City ----------
const BLOCK=60,ROAD=18,N=8,CELL=BLOCK+ROAD,HALF=N*CELL/2;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({map:asphalt,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
asphalt.repeat.set(500,500);scene.add(ground);
const grass=new THREE.Mesh(new THREE.RingGeometry(HALF+60,2000,4,1),new THREE.MeshStandardMaterial({color:0x5d7a3e,roughness:1}));grass.rotation.x=-Math.PI/2;grass.rotation.z=Math.PI/4;grass.position.y=.01;scene.add(grass);
const buildings=[];const dummy=new THREE.Object3D();
const instances={};function inst(key,geo,mat,max){if(!instances[key]){const m=new THREE.InstancedMesh(geo,mat,max);m.count=0;m.castShadow=true;m.receiveShadow=true;scene.add(m);instances[key]=m}return instances[key]}
function put(key,geo,mat,max,p,r=[0,0,0],s=[1,1,1]){const m=inst(key,geo,mat,max);if(m.count>=m.instanceMatrix.count){console.warn("inst overflow",key);return}dummy.position.set(...p);dummy.rotation.set(...r);dummy.scale.set(...s);dummy.updateMatrix();m.setMatrixAt(m.count++,dummy.matrix)}
const sideGeo=new THREE.BoxGeometry(BLOCK,.25,BLOCK),sideMat=new THREE.MeshStandardMaterial({map:paving,roughness:.9});paving.repeat.set(15,15);
const curbGeo=new THREE.BoxGeometry(BLOCK+.6,.26,BLOCK+.6),curbMat=new THREE.MeshStandardMaterial({color:0xb5b2aa,roughness:.8});
const poleGeo=new THREE.CylinderGeometry(.12,.16,7,8),poleMat=new THREE.MeshStandardMaterial({color:0x3b3f44,metalness:.8,roughness:.4});
const armGeo=new THREE.BoxGeometry(.12,.12,2),headGeo=new THREE.BoxGeometry(.5,.18,.9),headMat=new THREE.MeshStandardMaterial({color:0xfff6d8,emissive:0xfff2c0,emissiveIntensity:.3});
const treeT=new THREE.CylinderGeometry(.18,.25,2.5,6),treeTM=new THREE.MeshStandardMaterial({color:0x5a4030}),treeC=new THREE.IcosahedronGeometry(1.8,1),treeCM=new THREE.MeshStandardMaterial({color:0x3f6a2e,roughness:1});
const roofMat=new THREE.MeshStandardMaterial({color:0x55585c,roughness:.9}),hvacGeo=new THREE.BoxGeometry(1,1,1),hvacMat=new THREE.MeshStandardMaterial({color:0x9aa0a6,metalness:.5,roughness:.5});
for(let i=0;i<N;i++)for(let j=0;j<N;j++){
 const cx=-HALF+i*CELL+ROAD+BLOCK/2,cz=-HALF+j*CELL+ROAD+BLOCK/2;
 put('curb',curbGeo,curbMat,N*N,[cx,.13,cz]);put('side',sideGeo,sideMat,N*N,[cx,.14,cz]);
 for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]]){const px=cx+dx*(BLOCK/2-1),pz=cz+dz*(BLOCK/2-1);
  put('pole',poleGeo,poleMat,2000,[px,3.6,pz]);const ang=Math.atan2(-dx,-dz)+Math.PI;
  put('arm',armGeo,poleMat,N*N*8,[px+Math.sin(ang)*1,7,pz+Math.cos(ang)*1],[0,ang,0]);put('head',headGeo,headMat,N*N*8,[px+Math.sin(ang)*1.9,6.9,pz+Math.cos(ang)*1.9],[0,ang,0]);}
 if(i==N/2&&j==N/2){for(let k=0;k<14;k++){const a=k/14*Math.PI*2;put('tt',treeT,treeTM,600,[cx+Math.cos(a)*20,1.4,cz+Math.sin(a)*20]);put('tc',treeC,treeCM,600,[cx+Math.cos(a)*20,3.8,cz+Math.sin(a)*20])}continue}
 for(let k=-2;k<=2;k++){if(k==0)continue;put('tt',treeT,treeTM,600,[cx+k*12,1.4,cz-BLOCK/2+3]);put('tc',treeC,treeCM,600,[cx+k*12,3.8,cz-BLOCK/2+3])}
 const central=Math.hypot(i-3.5,j-3.5)<2.3,k=Math.random()<.5?1:2,s=(BLOCK-12)/k;
 for(let a=0;a<k;a++)for(let b=0;b<k;b++){
  const w=s-rnd(1,6),d=s-rnd(1,6),h=central?rnd(50,110):rnd(14,45),fi=Math.random()*4|0;
  const t=facades[fi].clone();t.needsUpdate=true;t.repeat.set(w/(fi==3?16:24),h/24);
  const mat=new THREE.MeshStandardMaterial({map:t,roughness:fi==0||fi==3?.25:.8,metalness:fi==0?.6:.1});
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mat,mat,roofMat,roofMat,mat,mat]);
  const bx=cx-BLOCK/2+6+s*(a+.5),bz=cz-BLOCK/2+6+s*(b+.5);m.position.set(bx,h/2+.27,bz);m.castShadow=m.receiveShadow=true;scene.add(m);
  buildings.push(new THREE.Box3().setFromObject(m));
  put('parapet',new THREE.BoxGeometry(1,1,1),roofMat,300,[bx,h+.7,bz],[0,0,0],[w+.6,.9,d+.6]);
  put('hvac',hvacGeo,hvacMat,800,[bx+rnd(-w/4,w/4),h+1.8,bz+rnd(-d/4,d/4)],[0,0,0],[rnd(2,5),2,rnd(2,5)]);
  if(Math.random()<.5)put('hvac',hvacGeo,hvacMat,800,[bx+rnd(-w/4,w/4),h+1.4,bz+rnd(-d/4,d/4)],[0,0,0],[rnd(1.5,3),1.2,rnd(1.5,3)]);
 }}
// markings
const white=new THREE.MeshStandardMaterial({color:0xeeeeee,roughness:.7}),yellow=new THREE.MeshStandardMaterial({color:0xf2c230,roughness:.7});
const dashG=new THREE.PlaneGeometry(.2,3),lineG=new THREE.PlaneGeometry(.18,1),zebraG=new THREE.PlaneGeometry(.8,4);
for(let r=0;r<=N;r++){const c=-HALF+r*CELL+ROAD/2;
 for(let q=0;q<N;q++){const s0=-HALF+q*CELL+ROAD,mid=s0+BLOCK/2;
  for(const [axis,flip] of [[0,0],[1,1]]){
   const P=(along,acr,y=.02)=>axis?[along,y,acr]:[acr,y,along];const R=[-Math.PI/2,0,axis?Math.PI/2:0];
   put('yl',lineG,yellow,(N+1)*N*4,P(mid,c-.2),R,[1,BLOCK-10,1]);put('yl',lineG,yellow,(N+1)*N*4,P(mid,c+.2),R,[1,BLOCK-10,1]);
   for(let t=s0+6;t<s0+BLOCK-5;t+=8){put('dash',dashG,white,(N+1)*N*2*16,P(t,c-4.5),R);put('dash',dashG,white,(N+1)*N*2*16,P(t,c+4.5),R)}
   for(const e of [s0+2.5,s0+BLOCK-2.5])for(let z=-ROAD/2+1;z<ROAD/2;z+=1.6)put('zebra',zebraG,white,(N+1)*N*2*2*12,P(e,c+z,.021),[-Math.PI/2,0,axis?0:Math.PI/2]);
 }}}
// traffic lights
const tlBox=new THREE.BoxGeometry(.5,1.4,.45),tlMat=new THREE.MeshStandardMaterial({color:0x222}),lampG=new THREE.SphereGeometry(.16,8,6);
const redM=new THREE.MeshStandardMaterial({color:0x300,emissive:0xff1a00,emissiveIntensity:3}),greenM=new THREE.MeshStandardMaterial({color:0x030,emissive:0x00ff60,emissiveIntensity:3}),offM=new THREE.MeshStandardMaterial({color:0x111});
const tLights=[];
for(let a=0;a<=N;a++)for(let b=0;b<=N;b++){const x=-HALF+a*CELL+ROAD/2,z=-HALF+b*CELL+ROAD/2;
 for(const [dx,dz,ax] of [[1,1,0],[-1,-1,0],[1,-1,1],[-1,1,1]]){if(Math.random()<.3)continue;const px=x+dx*(ROAD/2+.8),pz=z+dz*(ROAD/2+.8);
  put('pole',poleGeo,poleMat,2000,[px,3.6,pz]);const g=new THREE.Group();g.position.set(px,5.5,pz);g.rotation.y=ax?Math.PI/2:0;
  g.add(new THREE.Mesh(tlBox,tlMat));const r=new THREE.Mesh(lampG,offM),gr=new THREE.Mesh(lampG,offM);r.position.set(0,.4,.24);gr.position.set(0,-.4,.24);g.add(r,gr);scene.add(g);tLights.push({r,gr,ax});}}
for(const k in instances)instances[k].instanceMatrix.needsUpdate=true;
// ---------- Roadster ----------
function profileGeo(pts,width,bevel){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const p=pts[i];p.length==4?s.quadraticCurveTo(p[0],p[1],p[2],p[3]):s.lineTo(p[0],p[1])}
 const g=new THREE.ExtrudeGeometry(s,{depth:width-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*.8,bevelSegments:6,curveSegments:24});g.rotateY(Math.PI/2);g.translate(-(width-2*bevel)/2,0,0);g.computeVertexNormals();return g}
function makeRoadster(color){
 const g=new THREE.Group();
 const paint=new THREE.MeshPhysicalMaterial({color,metalness:.6,roughness:.35,clearcoat:1,clearcoatRoughness:.05});
 const dark=new THREE.MeshStandardMaterial({color:0x0c0d0f,metalness:.4,roughness:.5});
 const glass=new THREE.MeshPhysicalMaterial({color:0x0a1018,metalness:.1,roughness:.02,transmission:0,opacity:.85,transparent:true,clearcoat:1,envMapIntensity:2});
 // Esprit-style wedge: low pointed nose, flat hood, cab-forward, fastback deck, chopped tail
 const body=new THREE.Mesh(profileGeo([[2.32,.34],[2.38,.5,2.2,.6],[.75,.82],[-.4,.9,-1.6,.92],[-2.25,.88],[-2.36,.84,-2.34,.5],[-2.3,.26],[-1.9,.22],[-1.3,.22,-1.3,.5],[-1.3,.62,-1.1,.62],[-.6,.62,-.6,.5],[-.6,.22],[.75,.22],[.75,.5],[.75,.62,1.0,.62],[1.6,.62,1.6,.5],[1.6,.22],[2.2,.22]],1.98,.07),paint);
 g.add(body);
 const canopy=new THREE.Mesh(profileGeo([[.95,.8],[.25,1.1,-.25,1.13],[-.7,1.14,-1.75,.9],[-1.6,.85],[.9,.78]],1.42,.06),glass);g.add(canopy);
 const tbar=new THREE.Mesh(new THREE.BoxGeometry(.32,.04,1.3),paint);tbar.position.set(0,1.26,-.25);g.add(tbar); // T-top roof strip
 const skirt=new THREE.Mesh(new THREE.BoxGeometry(2.0,.1,4.3),dark);skirt.position.y=.2;g.add(skirt);
 // winglets behind front fenders (with repeater)
 for(const sx of[-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(.06,.05,.5),dark);w.position.set(sx*1.03,.72,-.55);w.rotation.y=sx*.08;g.add(w);
  const rep=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.2),new THREE.MeshStandardMaterial({color:0xffa000,emissive:0xff9000,emissiveIntensity:2}));rep.position.set(sx*1.07,.72,-.62);g.add(rep)}
 const hlMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xe8f2ff,emissiveIntensity:4});
 for(const sx of[-1,1]){const hl=new THREE.Mesh(new THREE.BoxGeometry(.55,.035,.1),hlMat);hl.position.set(sx*.55,.56,-2.26);hl.rotation.y=-sx*.25;g.add(hl)}
 const tail=new THREE.Mesh(new THREE.BoxGeometry(1.86,.035,.04),new THREE.MeshStandardMaterial({color:0x400000,emissive:0xff0a0a,emissiveIntensity:2.2}));tail.position.set(0,.8,2.4);g.add(tail);g.tail=tail;
 // rear: 4 CGT nozzles between fan array and taillight; 4 suction fans below bumper
 const noz=new THREE.MeshStandardMaterial({color:0x9da3aa,metalness:1,roughness:.25});
 const nozG=new THREE.CylinderGeometry(.07,.11,.18,16,1,true);
 g.rear=[];for(const x of[-.6,-.2,.2,.6]){const n=new THREE.Mesh(nozG,noz);n.rotation.x=Math.PI/2;n.position.set(x,.6,2.38);g.add(n);g.rear.push(new THREE.Vector3(x,.6,2.5))}
 for(const x of[-.66,-.22,.22,.66]){const f=new THREE.Mesh(new THREE.CircleGeometry(.17,20),dark);f.position.set(x,.33,2.37);g.add(f);const hub=new THREE.Mesh(new THREE.CircleGeometry(.05,10),noz);hub.position.set(x,.33,2.375);g.add(hub)}
 // 4 downward lift nozzles + 2 nose side nozzles
 g.down=[];g.glows=[];const glowM=new THREE.MeshStandardMaterial({color:0x000,emissive:0xbfe6ff,emissiveIntensity:0,side:THREE.DoubleSide});
 for(const [x,z] of[[-.62,-1.05],[.62,-1.05],[-.62,1.05],[.62,1.05]]){const n=new THREE.Mesh(new THREE.CylinderGeometry(.13,.09,.14,16,1,true),noz);n.position.set(x,.15,z);g.add(n);
  const gl=new THREE.Mesh(new THREE.CircleGeometry(.1,16),glowM);gl.rotation.x=Math.PI/2;gl.position.set(x,.085,z);g.add(gl);g.down.push(new THREE.Vector3(x,.06,z))}
 g.glowM=glowM;
 for(const sx of[-1,1]){const n=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.1,12),noz);n.rotation.z=Math.PI/2;n.position.set(sx*1.04,.45,-1.85);g.add(n)}
 // wheels
 const tireM=new THREE.MeshStandardMaterial({color:0x151515,roughness:.85}),rimM=new THREE.MeshStandardMaterial({color:0x2a2c30,metalness:1,roughness:.2}),discM=new THREE.MeshStandardMaterial({color:0x777,metalness:.9,roughness:.4}),calM=new THREE.MeshStandardMaterial({color:0xcc1111,roughness:.4});
 g.wheels=[];
 for(const [x,z,r] of[[-.9,-1.32,.34],[.9,-1.32,.34],[-.92,1.38,.37],[.92,1.38,.37]]){
  const w=new THREE.Group();w.position.set(x,r,z);const sx=Math.sign(x);
  const tire=new THREE.Mesh(new THREE.TorusGeometry(r*.78,r*.22,12,32),tireM);tire.rotation.y=Math.PI/2;tire.scale.set(1,1,1.3);
  const spin=new THREE.Group();spin.add(tire);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.62,r*.62,.08,32),rimM);rim.rotation.z=Math.PI/2;rim.position.x=sx*.08;spin.add(rim);
  for(let k=0;k<5;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.04,r*1.1,.07),rimM);sp.position.x=sx*.13;sp.rotation.x=k/5*Math.PI;spin.add(sp)}
  w.add(spin);const disc=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.5,.03,24),discM);disc.rotation.z=Math.PI/2;w.add(disc);
  const cal=new THREE.Mesh(new THREE.BoxGeometry(.08,.16,.22),calM);cal.position.set(sx*.04,r*.25,-r*.25);w.add(cal);
  g.add(w);g.wheels.push(spin);}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 return g;}
function makeTraffic(color){const g=new THREE.Group();const p=new THREE.MeshPhysicalMaterial({color,metalness:.5,roughness:.4,clearcoat:.6});
 const b=new THREE.Mesh(new THREE.BoxGeometry(1.9,.7,4.4),p);b.position.y=.65;const c=new THREE.Mesh(new THREE.BoxGeometry(1.6,.55,2.2),new THREE.MeshPhysicalMaterial({color:0x1a2230,roughness:.05,metalness:.3}));c.position.set(0,1.25,.2);
 const t=new THREE.Mesh(new THREE.BoxGeometry(1.6,.12,.05),new THREE.MeshStandardMaterial({emissive:0xff1010,emissiveIntensity:2}));t.position.set(0,.8,2.21);g.add(b,c,t);
 for(const [x,z] of[[-.9,-1.4],[.9,-1.4],[-.9,1.4],[.9,1.4]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.25,14),new THREE.MeshStandardMaterial({color:0x111}));w.rotation.z=Math.PI/2;w.position.set(x,.34,z);g.add(w)}
 b.castShadow=c.castShadow=true;return g}
const car=makeRoadster(0xb3001b);scene.add(car);
const traffic=[];for(let i=0;i<40;i++){const c=makeTraffic(new THREE.Color().setHSL(Math.random(),rnd(.1,.7),rnd(.2,.7)));const axis=Math.random()<.5,line=Math.floor(Math.random()*(N+1)),dir=Math.random()<.5?1:-1;
 c.userData={axis,dir,off:-HALF+line*CELL+ROAD/2+dir*(Math.random()<.5?2.3:6.5),t:rnd(-HALF,HALF),v:rnd(9,15),push:new THREE.Vector3(),stun:0};scene.add(c);traffic.push(c)}
// rings
const rings=[];for(let i=0;i<12;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(7,.6,10,40),new THREE.MeshStandardMaterial({color:0x00ff99,emissive:0x00ff88,emissiveIntensity:2.5}));const a=i/12*Math.PI*2;r.position.set(Math.cos(a)*200,rnd(70,180),Math.sin(a)*200);r.lookAt(0,r.position.y,0);scene.add(r);rings.push(r)}
// ---------- gas plume particles (cold N2: white translucent, expanding) ----------
const PN=1500,pGeo=new THREE.BufferGeometry(),pPos=new Float32Array(PN*3),pAge=new Float32Array(PN).fill(9),pMax=new Float32Array(PN).fill(1),pVel=new Float32Array(PN*3);
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('age',new THREE.BufferAttribute(pAge,1));pGeo.setAttribute('maxAge',new THREE.BufferAttribute(pMax,1));
const pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{scale:{value:innerHeight/2}},
 vertexShader:`attribute float age,maxAge;varying float vA;uniform float scale;void main(){float t=clamp(age/maxAge,0.,1.);vA=(1.-t)*(t<.08?t/.08:1.)*step(age,maxAge);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=(0.25+2.6*t)*scale/-mv.z;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);float a=smoothstep(.5,.0,d)*vA*.35;gl_FragColor=vec4(vec3(.93,.96,1.),a);}`});
const pts=new THREE.Points(pGeo,pMat);pts.frustumCulled=false;scene.add(pts);let pIdx=0;
function emit(wp,dir,spd,life){const i=pIdx++%PN;pPos.set([wp.x,wp.y,wp.z],i*3);pVel[i*3]=dir.x*spd+rnd(-1,1);pVel[i*3+1]=dir.y*spd+rnd(-1,1);pVel[i*3+2]=dir.z*spd+rnd(-1,1);pAge[i]=0;pMax[i]=life}
// ---------- post ----------
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.35,.4,.92);composer.addPass(bloom);composer.addPass(new OutputPass());
// ---------- input ----------
const keys={};let flight=false,camMode=0;
const toggleF=()=>flight=!flight,toggleC=()=>camMode=(camMode+1)%3;
const PREV=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
addEventListener('keydown',e=>{if(PREV.includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code=='Space'&&!flight)flight=true;if(e.repeat)return;if(e.code=='KeyF')toggleF();if(e.code=='KeyC')toggleC();if(e.code=='KeyR')reset()});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
let orbY=0,orbP=0,dragId=null,dx0=0,dy0=0;renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType=='touch'&&document.body.classList.contains('touch')&&false)return;dragId=e.pointerId;dx0=e.clientX;dy0=e.clientY;renderer.domElement.setPointerCapture(dragId)});renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==dragId)return;orbY-=(e.clientX-dx0)*.006;orbP=THREE.MathUtils.clamp(orbP+(e.clientY-dy0)*.004,-.4,1.2);dx0=e.clientX;dy0=e.clientY});const dEnd=()=>dragId=null;renderer.domElement.addEventListener('pointerup',dEnd);renderer.domElement.addEventListener('pointercancel',dEnd);renderer.domElement.addEventListener('dblclick',()=>{orbY=orbP=0});
const joy={x:0,y:0};
if('ontouchstart' in window||navigator.maxTouchPoints>0)document.body.classList.add('touch');
const jEl=document.getElementById('joy'),knob=document.getElementById('knob');let jid=null;
const jMove=t=>{const r=jEl.getBoundingClientRect();let x=(t.clientX-r.left-70)/55,y=(t.clientY-r.top-70)/55;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joy.x=x;joy.y=y;knob.style.transform=`translate(${x*45}px,${y*45}px)`};
jEl.addEventListener('pointerdown',e=>{jid=e.pointerId;jEl.setPointerCapture(jid);jMove(e)});jEl.addEventListener('pointermove',e=>{if(e.pointerId==jid)jMove(e)});
const jEnd=()=>{jid=null;joy.x=joy.y=0;knob.style.transform=''};jEl.addEventListener('pointerup',jEnd);jEl.addEventListener('pointercancel',jEnd);
document.querySelectorAll('#btns [data-k]').forEach(b=>{const k=b.dataset.k;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true});for(const ev of['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>keys[k]=false)});
document.getElementById('bf').onpointerdown=toggleF;document.getElementById('bc').onpointerdown=toggleC;
// ---------- sim ----------
const vel=new THREE.Vector3(),pos=car.position;let heading=0,thrust=0,boost=0,hp=100,score=0,shake=0,msg='',msgT=0;
const START=new THREE.Vector3(-HALF+(N/2)*CELL+ROAD/2+2.3,0,30);
function reset(){pos.copy(START);vel.set(0,0,0);heading=0;flight=false;hp=100}reset();
window.game={scene,camera,keys,get state(){return{flight,pos:pos.clone(),heading,score,hp,fps}},set flight(v){flight=v},set cam(v){camMode=v}};
const GRAV=20,CEIL=600,carBox=new THREE.Box3(),hud=document.getElementById('hud'),flash=document.getElementById('flash'),clock=new THREE.Clock(),UP=new THREE.Vector3(0,1,0);
let fps=60,fAcc=0,fN=0,lightT=0;
function hit(dmg,text){hp=Math.max(0,hp-dmg);shake=Math.min(1,shake+dmg/20);flash.style.opacity=Math.min(.5,dmg/30);setTimeout(()=>flash.style.opacity=0,120);msg=text;msgT=1.5;if(hp<=0){msg='车辆损毁！按 R 重置';msgT=99}}
function step(dt){
 const fwd=new THREE.Vector3(-Math.sin(heading),0,-Math.cos(heading)),speed=vel.dot(fwd);
 const steer=THREE.MathUtils.clamp((keys.KeyA||keys.ArrowLeft||keys.KeyQ?1:0)-(keys.KeyD||keys.ArrowRight||keys.KeyE?1:0)-joy.x,-1,1),acc=THREE.MathUtils.clamp((keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y,-1,1);
 const dead=hp<=0,grounded=pos.y<.05;
 heading+=steer*dt*(flight?1.6:1.9)*(flight?1:Math.max(.7,Math.min(1,Math.abs(speed)/6)))*(speed<-.5&&!flight?-1:1);
 if(!dead)vel.addScaledVector(fwd,acc*(flight?34:26)*dt);
 boost+=((acc>0&&!dead?1:0)-boost)*Math.min(1,dt*5);
 const upIn=(keys.Space?1:0)-(keys.ShiftLeft||keys.ShiftRight?1:0);if(upIn>0&&!flight&&!dead)flight=true;
 let lift=0;if(flight&&!dead)lift=GRAV+upIn*(upIn>0?85:30);
 thrust+=((flight&&!dead?.45+Math.max(0,lift-GRAV)/62*.55+(grounded&&upIn<=0?-.3:0):0)-thrust)*Math.min(1,dt*8);
 vel.y+=(lift-GRAV)*dt;
 const lat=vel.clone().setY(0),along=fwd.clone().multiplyScalar(lat.dot(fwd));vel.sub(lat.sub(along).multiplyScalar(Math.min(1,dt*(grounded?9:1.8))));
 const drag=flight?.5:.45;vel.x*=1-dt*drag;vel.z*=1-dt*drag;if(flight)vel.y*=1-dt*1.0;
 const old=pos.clone();pos.addScaledVector(vel,dt);
 if(pos.y<0){if(vel.y<-15)hit(Math.min(40,(-vel.y-15)*2),'硬着陆！');pos.y=0;if(vel.y<0)vel.y=0}
 if(pos.y>CEIL){pos.y=CEIL;vel.y=Math.min(vel.y,0)}
 carBox.setFromCenterAndSize(pos.clone().setY(pos.y+.65),new THREE.Vector3(2.2,1.3,2.2));
 for(const b of buildings)if(b.intersectsBox(carBox)){const sp=vel.length();pos.copy(old);vel.multiplyScalar(-.35);if(sp>8)hit(sp*.6,'撞到建筑！');break}
 const lim=HALF+400;pos.x=THREE.MathUtils.clamp(pos.x,-lim,lim);pos.z=THREE.MathUtils.clamp(pos.z,-lim,lim);
 // traffic
 for(const c of traffic){const u=c.userData;
  if(u.stun>0){u.stun-=dt;c.position.addScaledVector(u.push,dt);u.push.multiplyScalar(1-dt*2.5)}else{u.t+=u.v*u.dir*dt;if(u.t>HALF)u.t=-HALF;if(u.t<-HALF)u.t=HALF;
   if(u.axis){c.position.set(u.off,0,u.t);c.rotation.y=u.dir>0?Math.PI:0}else{c.position.set(u.t,0,u.off);c.rotation.y=u.dir>0?-Math.PI/2:Math.PI/2}}
  const d=new THREE.Vector3().subVectors(pos,c.position);d.y=0;
  if(pos.y<1.6&&d.length()<2.6){const tv=u.stun>0?u.push.clone():new THREE.Vector3(u.axis?0:u.v*u.dir,0,u.axis?u.v*u.dir:0);const rel=vel.clone().sub(tv).setY(0).length();d.normalize();
   pos.addScaledVector(d,2.6-new THREE.Vector3().subVectors(pos,c.position).setY(0).length());
   const vn=vel.dot(d);if(vn<0)vel.addScaledVector(d,-1.6*vn);vel.addScaledVector(d,3);u.push.copy(d).multiplyScalar(-rel*.6);u.stun=2;
   if(u.axis)u.t=c.position.z;else u.t=c.position.x;if(rel>3)hit(rel*.8,'撞车了！')}}
 // visuals
 car.rotation.set(0,heading,0);if(flight&&!grounded){car.rotateX(-acc*.12);car.rotateZ(steer*.18)}
 for(const w of car.wheels)w.rotation.x-=speed*dt/.35;
 car.glowM.emissiveIntensity=thrust*6;
 for(const p of car.down)if(thrust>.05)for(let k=0;k<3;k++)emit(car.localToWorld(p.clone()),new THREE.Vector3(0,-1,0).applyQuaternion(car.quaternion),rnd(14,22)*thrust,rnd(.5,1.1));
 if(boost>.3&&(flight||speed>5))for(const p of car.rear)if(Math.random()<boost)emit(car.localToWorld(p.clone()),new THREE.Vector3(0,0,1).applyQuaternion(car.quaternion),rnd(10,18),rnd(.3,.6));
 for(let i=0;i<PN;i++){if(pAge[i]>pMax[i])continue;pAge[i]+=dt;const k=1-dt*2.5;pVel[i*3]*=k;pVel[i*3+2]*=k;pVel[i*3+1]=pVel[i*3+1]*k+1.5*dt;
  pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
  if(pPos[i*3+1]<.1){pPos[i*3+1]=.1;const vy=pVel[i*3+1];pVel[i*3+1]=0;pVel[i*3]+=rnd(-1,1)*-vy*.8;pVel[i*3+2]+=rnd(-1,1)*-vy*.8}}
 pGeo.attributes.position.needsUpdate=pGeo.attributes.age.needsUpdate=pGeo.attributes.maxAge.needsUpdate=true;
 for(const r of rings){r.rotation.z+=dt*.6;if(r.visible&&r.position.distanceTo(pos)<7.5){r.visible=false;score++;msg=`光环 ${score}/${rings.length}`;msgT=1.5}}
 lightT+=dt;const ph=(lightT%16)<8;for(const t of tLights){const go=(t.ax==0)==ph;t.r.material=go?offM:redM;t.gr.material=go?greenM:offM}
 // camera
 const off=camMode==3?new THREE.Vector3(-6,1.8,-6.5):camMode==0?new THREE.Vector3(0,2.2,7.5):camMode==1?new THREE.Vector3(0,16,30):new THREE.Vector3(0,1.15,.1);
 if(camMode!=2){off.applyAxisAngle(new THREE.Vector3(1,0,0),-orbP*.6);off.applyAxisAngle(UP,orbY)}off.applyAxisAngle(UP,heading);const target=pos.clone().add(off);
 if(camMode==2)camera.position.copy(target);else{camera.position.lerp(target,Math.min(1,dt*5));if(camera.position.y<.5)camera.position.y=.5}
 if(shake>0){camera.position.x+=rnd(-1,1)*shake*.4;camera.position.y+=rnd(-1,1)*shake*.4;shake=Math.max(0,shake-dt*2)}
 camera.lookAt(camMode==2?pos.clone().addScaledVector(fwd,30).setY(pos.y+1):pos.clone().setY(pos.y+.9));
 sky.position.copy(camera.position);sun.position.copy(pos).addScaledVector(sunDir,400);sun.target.position.copy(pos);
 msgT-=dt;
 hud.innerHTML=`模式: <b>${flight?'✈ 飞行 (Rocket)':'🚗 道路'}</b><br>速度: ${(vel.length()*3.6).toFixed(0)} km/h<br>高度: ${pos.y.toFixed(1)} m<br>升力推进: ${(thrust*100).toFixed(0)}%<br>光环: ${score}/${rings.length}<br>车况: <div id="hp"><i style="width:${hp}%;background:${hp>50?'#3f8':hp>25?'#fc3':'#f43'}"></i></div>${msgT>0?`<b style="color:#ff6">${msg}</b><br>`:''}<small>${fps.toFixed(0)} fps</small>`;
}
function loop(){const dt=Math.min(clock.getDelta(),.05);fAcc+=dt;fN++;if(fAcc>.5){fps=fN/fAcc;fAcc=fN=0}step(dt);composer.render();requestAnimationFrame(loop)}loop();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);pMat.uniforms.scale.value=innerHeight/2});
