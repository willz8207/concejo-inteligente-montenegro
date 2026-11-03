
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================================================================
   DATOS — edita aquí. Fuente: directorio oficial del Concejo
   (concejo-montenegro.gov.co), período 2024-2027.
   foto: ruta o data URI de la imagen (vacío = iniciales).
   hojaDeVida, comision, ponencias, votaciones y asistencia se
   llenan cuando lleguen los documentos y el módulo de Sesiones.
   ================================================================ */
const {PARTIDOS, CONCEJALES} = window.CI;

/* ================================================================ */
const $ = s=>document.querySelector(s);
const initials = n=>{const p=n.split(" ");return (p[0][0]+(p[2]?p[2][0]:p[1][0])).toUpperCase();};
const shortName = n=>{const p=n.split(" ");return p.length>=4? `${p[0]} ${p[2]}` : `${p[0]} ${p[p.length-1]}`;};

/* ---------- Leyenda: partidos y comisiones ---------- */
const legend = $("#legend");
let filter = null; // {t:"p"|"c", v}
const COM_COLORS = {plan:"#2f7fd1", gobierno:"#c4521a", hacienda:"#8a4fd1", "":"#8a958d"};
function buildLegend(){
  const pc={}, cc={plan:0,gobierno:0,hacienda:0,"":0};
  CONCEJALES.forEach(c=>{pc[c.partido]=(pc[c.partido]||0)+1; cc[CI.comisionKey(c.id)]++;});
  const chip=(t,v,label,color,n)=>`<button class="chip" type="button" data-t="${t}" data-v="${v}" aria-pressed="${filter?filter.t===t&&filter.v===v:t===""}">${color?`<span class="dot" style="background:${color}"></span>`:""}${label} <b>${n}</b></button>`;
  legend.innerHTML = `<div class="lg-row"><span class="lg-lbl">Partidos</span>${chip("","","Todos",null,13)}${Object.keys(PARTIDOS).map(p=>chip("p",p,p,PARTIDOS[p].color,pc[p]||0)).join("")}</div>
    <div class="lg-row"><span class="lg-lbl">Comisiones</span>${Object.entries(CI.COMISIONES).map(([k,x])=>chip("c",k,x.corto,COM_COLORS[k],cc[k])).join("")}${cc[""]?chip("c","","Sin asignar",COM_COLORS[""],cc[""]):""}</div>`;
}
legend.addEventListener("click",e=>{
  const b=e.target.closest(".chip"); if(!b) return;
  const t=b.dataset.t, v=b.dataset.v;
  filter = !t || (filter&&filter.t===t&&filter.v===v) ? null : {t,v};
  buildLegend(); applyFilter();
});
buildLegend();

/* ---------- Escena ---------- */
const canvas = $("#scene"), stage=$("#stage");
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.minDistance = 3; controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI*0.47;
controls.target.set(0,0.8,-2.5);

scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3c4a3f, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6,14,10); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:40});
scene.add(sun);

const M = (color,opts={})=>new THREE.MeshStandardMaterial({color, roughness:.75, metalness:.05, ...opts});
const woodMat = M(0x8a5a34,{roughness:.6});
const woodDark = M(0x5e3b20,{roughness:.6});

// Piso y alfombra
const floor = new THREE.Mesh(new THREE.CircleGeometry(13,64), M(0xcdb89a,{roughness:.9}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const carpet = new THREE.Mesh(new THREE.RingGeometry(3.6,8.6,64,1,Math.PI,Math.PI), M(0x2f6a4a,{roughness:1}));
carpet.rotation.x=-Math.PI/2; carpet.position.y=.01; carpet.receiveShadow=true; scene.add(carpet);
const tier = new THREE.Mesh(new THREE.RingGeometry(6.3,8.6,64,1,Math.PI,Math.PI), M(0x28593e,{roughness:1}));
// Gradería: anillo elevado para la fila de atrás
const tierBox = new THREE.Mesh(new THREE.CylinderGeometry(8.6,8.6,.35,64,1,false,Math.PI/2,Math.PI), M(0x6f4a2c));
tierBox.position.y=.175; tierBox.receiveShadow=true; tierBox.castShadow=true; scene.add(tierBox);
const tierCut = new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.3,.36,64,1,false,Math.PI/2,Math.PI), M(0x2f6a4a,{roughness:1}));
tierCut.position.y=.18; scene.add(tierCut);
tier.position.y=.355; tier.rotation.x=-Math.PI/2; tier.receiveShadow=true; scene.add(tier);

// Muro curvo del fondo
const wall = new THREE.Mesh(new THREE.CylinderGeometry(11,11,4.2,64,1,true,Math.PI/2,Math.PI), M(0xe8dcc6,{side:THREE.BackSide,roughness:.95}));
wall.position.y=2.1; wall.receiveShadow=true; scene.add(wall);
const wainscot = new THREE.Mesh(new THREE.CylinderGeometry(10.95,10.95,1.1,64,1,true,Math.PI/2,Math.PI), M(0x7a4f2e,{side:THREE.BackSide}));
wainscot.position.y=.55; scene.add(wainscot);

// Texto en canvas
function textTexture(draw,w=512,h=256){
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;
}

// Logo del Concejo y cuadros del municipio en el muro
const texLoader = new THREE.TextureLoader();
function loadTex(src){const t=texLoader.load(src); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;}
function framed(src,w,h,angle,y,pick){
  const g=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(w+.22,h+.22,.08), M(0x4a2e18,{roughness:.5}));
  const pic=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:loadTex(src),roughness:.85}));
  pic.position.z=.045; frame.castShadow=true;
  g.add(frame,pic);
  g.position.set(Math.cos(angle)*10.82,y,Math.sin(angle)*10.82); g.lookAt(0,y,0);
  if(pick) g.traverse(o=>{o.userData.pick=pick;});
  scene.add(g); return g;
}
framed("img/logo-concejo.png",1.7,1.7,Math.PI*1.5,2.65,"logo");
framed("img/templo-torre.jpg",1.75,2.53,Math.PI*1.27,2.45,"foto-templo");
framed("img/parque-principal.jpg",3.3,1.86,Math.PI*1.73,2.45,"foto-parque");
framed("img/mirador-parque-cafe.jpg",2.0,1.5,Math.PI*1.06,2.45,"foto-mirador");
framed("img/estacion-ferrocarril.jpg",2.1,1.4,Math.PI*1.16,2.45,"foto-estacion");
framed("img/teleferico-parque-cafe.jpg",2.1,1.4,Math.PI*1.84,2.45,"foto-teleferico");
framed("img/atardecer.jpg",3.0,1.0,Math.PI*1.95,2.55,"foto-atardecer");

// Banderas: Quindío, Colombia y Montenegro juntas, a la derecha de la mesa directiva.
// Cuelgan a lo largo del asta (como en el recinto) y ondean al mismo ritmo.
const FLAG_W=.55, FLAG_H=1.55;
function flag(x,z,draw,pick){
  const gold=M(0xc9a64a,{metalness:.6,roughness:.3});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.4,12), gold);
  pole.position.set(x,1.7,z); pole.castShadow=true; scene.add(pole);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8), gold);
  knob.position.set(x,3.44,z); scene.add(knob);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.08,16), M(0x2b2b2b,{metalness:.4,roughness:.5}));
  base.position.set(x,.04,z); scene.add(base);
  const tex=textTexture(draw,300,800);
  const geo=new THREE.PlaneGeometry(FLAG_W,FLAG_H,8,16);
  const f=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.9}));
  f.position.set(x+FLAG_W/2+.03,3.3-FLAG_H/2,z); f.castShadow=true; scene.add(f);
  [pole,knob,base,f].forEach(o=>o.userData.pick=pick);
  return f;
}
const flagQuindio = flag(3.45,3.55,(g,w,h)=>{
  g.fillStyle="#088733";g.fillRect(0,0,w/3,h);g.fillStyle="#fcdd09";g.fillRect(w/3,0,w/3,h);g.fillStyle="#742d68";g.fillRect(w*2/3,0,w/3+1,h);
},"bandera-quindio");
const flagColombia = flag(4.12,3.45,(g,w,h)=>{
  g.fillStyle="#fcd116";g.fillRect(0,0,w,h/2);g.fillStyle="#003893";g.fillRect(0,h/2,w,h/4);g.fillStyle="#ce1126";g.fillRect(0,h*.75,w,h/4);
},"bandera-colombia");
// Montenegro: verde (1/2), blanco (1/4), rojo (1/4)
const flagMontenegro = flag(4.79,3.55,(g,w,h)=>{
  g.fillStyle="#07b430";g.fillRect(0,0,w,h/2);
  g.fillStyle="#ffffff";g.fillRect(0,h/2,w,h/4);
  g.fillStyle="#da121a";g.fillRect(0,h*.75,w,h/4);
},"bandera-montenegro");
const flags=[flagQuindio,flagColombia,flagMontenegro];

// Mesa directiva
const dais = new THREE.Group();
const platform = new THREE.Mesh(new THREE.BoxGeometry(6,.45,2), woodDark);
platform.position.set(0,.225,3.4); platform.receiveShadow=true; platform.castShadow=true; dais.add(platform);
const bench = new THREE.Mesh(new THREE.BoxGeometry(5,1,.5), woodMat);
bench.position.set(0,.95,2.75); bench.castShadow=true; dais.add(bench);
const benchTop = new THREE.Mesh(new THREE.BoxGeometry(5.2,.08,.8), M(0x4a2e18));
benchTop.position.set(0,1.48,2.85); benchTop.castShadow=true; dais.add(benchTop);
[-1.6,-.55,.55,1.6].forEach((x,i)=>{
  const ch=chair(i===1||i===2?0x1f6b45:0x3a4a40); ch.position.set(x,.45,3.55); ch.rotation.y=Math.PI; dais.add(ch);
});
dais.traverse(o=>{o.userData.pick="mesa";});
scene.add(dais);
const mesaLabel = new THREE.Sprite(new THREE.SpriteMaterial({map:textTexture((g,w,h)=>{
  roundRect(g,4,4,w-8,h-8,24); g.fillStyle="rgba(255,255,255,.92)"; g.fill();
  g.fillStyle="#1f6b45"; g.textAlign="center"; g.textBaseline="middle";
  g.font="700 46px 'Bricolage Grotesque', sans-serif"; g.fillText("Mesa Directiva",w/2,h*.4);
  g.fillStyle="#5b6b60"; g.font="400 30px 'Atkinson Hyperlegible', sans-serif"; g.fillText("Presidencia · Secretaría",w/2,h*.72);
},512,150), depthWrite:false}));
mesaLabel.scale.set(2.2,.65,1); mesaLabel.position.set(0,1.95,2.7); mesaLabel.userData.pick="mesa";
scene.add(mesaLabel);

// Puesto de la Secretaría General, a la izquierda de la mesa directiva
const secG=new THREE.Group(); secG.position.set(-4.05,0,3.05);
{ const d=new THREE.Mesh(new THREE.BoxGeometry(1.5,.82,.6),woodMat); d.position.set(0,.41,-.45); d.castShadow=true; d.receiveShadow=true;
  const t=new THREE.Mesh(new THREE.BoxGeometry(1.6,.06,.72),M(0x4a2e18)); t.position.set(0,.85,-.45); t.castShadow=true;
  const book=new THREE.Mesh(new THREE.BoxGeometry(.42,.05,.3),M(0x7d1f2e)); book.position.set(-.35,.9,-.45); book.rotation.y=.2;
  const lap=new THREE.Mesh(new THREE.BoxGeometry(.4,.02,.28),M(0x2b2b2b,{metalness:.4})); lap.position.set(.3,.89,-.45);
  const ch=chair(0x5e3b20); ch.rotation.y=Math.PI; ch.position.set(0,0,.1);
  secG.add(d,t,book,lap,ch); }
scene.add(secG);
function secTexture(nombre){
  return textTexture((g,w,h)=>{
    roundRect(g,4,4,w-8,h-8,24); g.fillStyle="rgba(255,255,255,.94)"; g.fill(); g.lineWidth=6; g.strokeStyle="#7d1f2e"; g.stroke();
    g.fillStyle="#7d1f2e"; g.textAlign="center"; g.textBaseline="middle";
    g.font="700 40px 'Bricolage Grotesque', sans-serif"; g.fillText("Secretaría General",w/2,h*.36);
    g.fillStyle=nombre?"#1d2a22":"#5b6b60"; g.font=(nombre?"700":"italic 400")+" 28px 'Atkinson Hyperlegible', sans-serif";
    g.fillText(nombre||"Por confirmar",w/2,h*.7,w-30);
  },512,150);
}
const secLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:secTexture(""),depthWrite:false}));
secLabel.scale.set(1.9,.56,1); secLabel.position.set(-4.05,1.75,2.7); scene.add(secLabel);
secG.traverse(o=>{o.userData.pick="secretaria";}); secLabel.userData.pick="secretaria";
function refreshSec(){ const tmp=document.createElement("div"); tmp.innerHTML=CI.mesa().secretario; secLabel.material.map?.dispose(); secLabel.material.map=secTexture(tmp.textContent); secLabel.material.needsUpdate=true; }

function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

function chair(color){
  const g=new THREE.Group(), mat=M(color,{roughness:.55});
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.6,.12,.55),mat); seat.position.y=.45;
  const back=new THREE.Mesh(new THREE.BoxGeometry(.6,.75,.1),mat); back.position.set(0,.85,.25);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.45,10),M(0x2b2b2b,{metalness:.5,roughness:.4})); leg.position.y=.22;
  [seat,back,leg].forEach(m=>{m.castShadow=true;g.add(m);});
  g.userData.mat=mat; return g;
}

/* ---------- Curules ---------- */
// Dos filas: 6 al frente (r=5) y 7 atrás (r=7.4, elevada). Se ordenan por ángulo y se asignan por bancada.
const slots=[];
function arc(n,r,y){for(let i=0;i<n;i++){const a=Math.PI*(1.12+0.76*i/(n-1)); slots.push({a,r,y});}}
arc(6,5,0); arc(7,7.4,.35);
slots.sort((p,q)=>p.a-q.a);

const seats=[]; // {c, group, card, chairMat, deskMat, pos}
CONCEJALES.forEach((c,i)=>{
  const s=slots[i], color=PARTIDOS[c.partido].color;
  const x=Math.cos(s.a)*s.r, z=Math.sin(s.a)*s.r;
  const g=new THREE.Group(); g.position.set(x,s.y,z);
  g.lookAt(0,s.y,0);
  // escritorio
  const deskMat=M(0x8a5a34,{roughness:.55});
  const desk=new THREE.Mesh(new THREE.BoxGeometry(1.15,.8,.5),deskMat); desk.position.set(0,.4,.55); desk.castShadow=true; desk.receiveShadow=true;
  const top=new THREE.Mesh(new THREE.BoxGeometry(1.25,.06,.62),M(0x4a2e18)); top.position.set(0,.83,.52); top.castShadow=true;
  const front=new THREE.Mesh(new THREE.BoxGeometry(1.16,.18,.02),M(color,{emissive:new THREE.Color(color),emissiveIntensity:.15})); front.position.set(0,.62,.81);
  // micrófono
  const mic=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.38,8),M(0x222222,{metalness:.6})); mic.position.set(.3,1.02,.48); mic.rotation.x=-.5;
  const ch=chair(color); ch.position.set(0,0,-.2); ch.rotation.y=Math.PI;
  g.add(desk,top,front,mic,ch);
  // tarjeta con foto/iniciales (sprite: siempre mira a la cámara)
  const cardTex=cardTexture(c);
  const card=new THREE.Sprite(new THREE.SpriteMaterial({map:cardTex,depthWrite:false}));
  card.scale.set(1.05,1.34,1); card.position.set(0,2.07,.35);
  g.add(card);
  g.traverse(o=>{o.userData.pick=c.id;});
  scene.add(g);
  seats.push({c,group:g,card,cardTex,chairMat:ch.userData.mat,deskMat,front,pos:new THREE.Vector3(x,s.y,z),angle:s.a,r:s.r});
  if(c.foto) loadPhoto(c, seats[seats.length-1]);
});

function cardTexture(c, img){
  const color=PARTIDOS[c.partido].color;
  return textTexture((g,w,h)=>{
    roundRect(g,6,6,w-12,h-12,34); g.fillStyle="#ffffff"; g.fill();
    g.lineWidth=10; g.strokeStyle=color; g.stroke();
    // foto o iniciales
    g.save(); roundRect(g,46,40,w-92,250,22); g.clip();
    if(img){const s=Math.max((w-92)/img.width,250/img.height); const iw=img.width*s, ih=img.height*s; g.drawImage(img,46+((w-92)-iw)/2,40+(250-ih)/2,iw,ih);}
    else{g.fillStyle=color; g.fillRect(46,40,w-92,250); g.fillStyle="#fff"; g.textAlign="center"; g.textBaseline="middle"; g.font="700 120px 'Bricolage Grotesque', sans-serif"; g.fillText(initials(c.nombre),w/2,168);}
    g.restore();
    g.fillStyle="#1d2a22"; g.textAlign="center"; g.textBaseline="alphabetic";
    g.font="700 40px 'Bricolage Grotesque', sans-serif"; g.fillText(c.corto||shortName(c.nombre),w/2,342);
    g.fillStyle=color; g.font="700 26px 'Atkinson Hyperlegible', sans-serif"; g.fillText(c.partido.toUpperCase(),w/2,382);
    const ck=CI.comisionKey(c.id), cn=ck?"Com. "+CI.COMISIONES[ck].corto:"Comisión por asignar";
    g.font="700 22px 'Atkinson Hyperlegible', sans-serif"; const tw=g.measureText(cn).width+30;
    roundRect(g,(w-tw)/2,400,tw,36,18); g.fillStyle=COM_COLORS[ck]; g.fill();
    g.fillStyle="#ffffff"; g.textBaseline="middle"; g.fillText(cn,w/2,419);
  },360,460);
}
function loadPhoto(c,seat){
  const img=new Image(); img.onload=()=>{seat.card.material.map=cardTexture(c,img); seat.card.material.needsUpdate=true;}; img.src=c.foto;
}
// Repintar tarjetas cuando carguen las fuentes
document.fonts?.ready.then(()=>seats.forEach(s=>{if(!s.c.foto){s.card.material.map=cardTexture(s.c);s.card.material.needsUpdate=true;}}));

/* ---------- Filtro por bancada ---------- */
function applyFilter(){
  seats.forEach(s=>{
    const on=!filter|| (filter.t==="p"? s.c.partido===filter.v : CI.comisionKey(s.c.id)===filter.v);
    s.card.material.opacity=on?1:.18; s.card.material.transparent=true;
    s.chairMat.opacity=on?1:.25; s.chairMat.transparent=!on;
    s.front.material.emissiveIntensity=on&&filter?.6:.15;
  });
}

/* ---------- Cámara ---------- */
let fly=null; // {pos, target}
const VIEWS={
  home:{pos:new THREE.Vector3(0,9.5,13.5),target:new THREE.Vector3(0,.8,-2.8)},
  pres:{pos:new THREE.Vector3(0,2.6,3.6),target:new THREE.Vector3(0,1.3,-5)},
};
function goTo(v){fly={pos:v.pos.clone(),target:v.target.clone()};}
function focusSeat(s){
  const dir=new THREE.Vector3(Math.cos(s.angle),0,Math.sin(s.angle));
  const target=s.pos.clone().add(new THREE.Vector3(0,1.4,0));
  const pos=s.pos.clone().sub(dir.multiplyScalar(4.2)).add(new THREE.Vector3(0,2.2,0));
  goTo({pos,target});
}
camera.position.copy(VIEWS.home.pos); controls.target.copy(VIEWS.home.target);
controls.addEventListener("start",()=>{fly=null; stopTour();});

/* ---------- Interacción ---------- */
const ray=new THREE.Raycaster(), mouse=new THREE.Vector2(), tip=$("#tip");
let hovered=null, downAt=null;
function pickAt(ev){
  const r=canvas.getBoundingClientRect();
  mouse.set(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(mouse,camera);
  const hit=ray.intersectObjects(scene.children,true).find(h=>h.object.userData.pick);
  return hit?hit.object.userData.pick:null;
}
canvas.addEventListener("pointermove",ev=>{
  const id=pickAt(ev);
  if(id!==hovered){ hovered=id; setHover(id); }
  if(id){const r=stage.getBoundingClientRect(); tip.hidden=false; tip.style.left=(ev.clientX-r.left)+"px"; tip.style.top=(ev.clientY-r.top)+"px";
    tip.textContent= id==="mesa"?"Mesa Directiva":id==="secretaria"?"Secretaría General":LUGARES[id]?LUGARES[id].titulo:CONCEJALES.find(c=>c.id===id).nombre; canvas.style.cursor="pointer";}
  else{tip.hidden=true; canvas.style.cursor="grab";}
});
canvas.addEventListener("pointerleave",()=>{tip.hidden=true; hovered=null; setHover(null);});
canvas.addEventListener("pointerdown",ev=>{downAt=[ev.clientX,ev.clientY];});
canvas.addEventListener("pointerup",ev=>{
  if(!downAt) return; const moved=Math.hypot(ev.clientX-downAt[0],ev.clientY-downAt[1]); downAt=null;
  if(moved>6) return;
  const id=pickAt(ev); if(!id) return;
  stopTour();
  if(id==="mesa"){openMesa(); goTo(VIEWS.home);}
  else if(id==="secretaria"){openSecretaria(); goTo({pos:new THREE.Vector3(-1.6,2.6,-.4),target:new THREE.Vector3(-4.05,1.2,3)});}
  else if(LUGARES[id]) openLugar(id);
  else openConcejal(id,true);
});

/* Cuadros del muro: logo y vistas del municipio */
const LUGARES={
  "logo":{titulo:"Concejo de Montenegro",sub:"“Forjando el bienestar de los montenegrinos”",img:"img/logo-concejo.png",angle:Math.PI*1.5,
    texto:"Este es el logo del Concejo Municipal. Lo verás en las convocatorias, actas y publicaciones oficiales de la corporación."},
  "bandera-colombia":{titulo:"Bandera de Colombia",sub:"Símbolo patrio nacional",flag:true,css:"linear-gradient(#fcd116 0 50%,#003893 50% 75%,#ce1126 75%)",
    texto:"Amarillo, azul y rojo. Va en el centro del grupo de banderas, entre la del Quindío y la de Montenegro. En la instalación y clausura de sesiones se entona el Himno Nacional."},
  "bandera-quindio":{titulo:"Bandera del Quindío",sub:"Símbolo del departamento",flag:true,css:"linear-gradient(90deg,#088733 0 33.33%,#fcdd09 33.33% 66.66%,#742d68 66.66%)",
    texto:"Tres franjas verticales del mismo ancho: verde, amarillo y morado. Está junto a las banderas de Colombia y de Montenegro, a la derecha de la mesa directiva."},
  "bandera-montenegro":{titulo:"Bandera de Montenegro",sub:"Símbolo del municipio",flag:true,img:"img/bandera-montenegro.png",
    texto:"Tres franjas horizontales: verde arriba, que ocupa la mitad; blanco en el centro y rojo abajo. Acompaña las sesiones del Concejo junto a las banderas de Colombia y del Quindío."},
  "foto-templo":{titulo:"Parroquia San José",sub:"Vista emblemática del municipio",img:"img/templo-torre.jpg",angle:Math.PI*1.27,
    texto:"La Parroquia San José y su torre del reloj son de las imágenes más reconocidas de Montenegro, en el corazón del pueblo."},
  "foto-mirador":{titulo:"Mirador del Parque del Café",sub:"Parque Nacional del Café",img:"img/mirador-parque-cafe.jpg",angle:Math.PI*1.06,
    texto:"El Parque Nacional del Café queda en zona rural de Montenegro y es uno de los destinos turísticos más visitados del Eje Cafetero.",
    credito:"Foto: Luis Rafael Martínez Angulo · CC BY-SA 3.0 · Wikimedia Commons"},
  "foto-estacion":{titulo:"Estación del Ferrocarril",sub:"Patrimonio del municipio",img:"img/estacion-ferrocarril.jpg",angle:Math.PI*1.16,
    texto:"La antigua estación del ferrocarril recuerda la época en que el tren unía a Montenegro con el resto de la región cafetera.",
    credito:"Foto: Jhon James Gutiérrez Gil · CC BY-SA 3.0 · Wikimedia Commons"},
  "foto-teleferico":{titulo:"Teleférico del Parque del Café",sub:"Parque Nacional del Café",img:"img/teleferico-parque-cafe.jpg",angle:Math.PI*1.84,
    texto:"El teleférico recorre el Parque del Café sobre cafetales y guaduales, con vista a las montañas del Quindío.",
    credito:"Foto: ACHETORRES · CC BY-SA 4.0 · Wikimedia Commons"},
  "foto-atardecer":{titulo:"Atardecer en Montenegro",sub:"Paisaje cafetero",img:"img/atardecer.jpg",angle:Math.PI*1.95,
    texto:"Desde Montenegro se ven atardeceres sobre el paisaje cafetero que hacen parte de su identidad.",
    credito:"Foto: Juan Pablo Galvis Franco · CC BY-SA 4.0 · Wikimedia Commons"},
  "foto-parque":{titulo:"Yo ❤ Montenegro",sub:"Vista emblemática del municipio",img:"img/parque-principal.jpg",angle:Math.PI*1.73,
    texto:"El letrero frente al templo, junto a las casas de arquitectura tradicional del Quindío, es parada obligada para propios y visitantes."},
};
function openLugar(id){
  const L=LUGARES[id]; currentIdx=-1; panelMode="lugar";
  const ph=$("#pPhoto"); ph.textContent=""; ph.style.background=L.css||"var(--accent-soft)"; if(L.img) ph.style.backgroundImage=`url("${L.img}")`;
  $("#pName").textContent=L.titulo;
  $("#pParty").innerHTML=`<span class="dot" style="background:var(--accent)"></span>Montenegro, Quindío`;
  $("#pRole").textContent=L.sub;
  tabsEl.innerHTML=""; $("#pPrev").hidden=$("#pNext").hidden=true;
  pBody.innerHTML=(L.img?`<img src="${L.img}" alt="${L.titulo}" style="width:100%;border-radius:12px;display:block;margin-bottom:12px;border:1px solid var(--line)">`
    :`<div role="img" aria-label="${L.titulo}" style="aspect-ratio:3/2;max-width:100%;border-radius:12px;margin-bottom:12px;background:${L.css}"></div>`)+`<p>${L.texto}</p>`+(L.credito?`<p class="note">${L.credito}</p>`:"");
  panel.hidden=false;
  if(L.flag){goTo({pos:new THREE.Vector3(2.6,2.4,-.6),target:new THREE.Vector3(4.1,2.3,3.5)}); return;}
  const dir=new THREE.Vector3(Math.cos(L.angle),0,Math.sin(L.angle));
  goTo({pos:dir.clone().multiplyScalar(5.5).add(new THREE.Vector3(0,2.6,0)),target:dir.clone().multiplyScalar(10.8).add(new THREE.Vector3(0,2.45,0))});
}
function setHover(id){
  seats.forEach(s=>{const on=s.c.id===id; s.card.scale.set(on?1.18:1.05,on?1.51:1.34,1); s.deskMat.emissive=new THREE.Color(on?0x3a2a10:0x000000);});
}

/* ---------- Ficha ---------- */
const panel=$("#panel"), pBody=$("#pBody"), tabsEl=$("#tabs");
let currentIdx=-1, currentTab="perfil", panelMode=null;
CI.refreshRecinto=()=>{ buildLegend(); applyFilter(); refreshSec();
  seats.forEach(st=>{ if(!st.c.foto){ st.card.material.map?.dispose(); st.card.material.map=cardTexture(st.c); st.card.material.needsUpdate=true; } });
  if(panel.hidden) return;
  if(panelMode==="concejal"&&currentIdx>=0){ $("#pRole").textContent=(CI.cargoDe(CONCEJALES[currentIdx].id)||"Concejal")+" · 2024–2027"; renderTab(); }
  else if(panelMode==="mesa") openMesa(); else if(panelMode==="secretaria") openSecretaria(); };
const TABS=[["perfil","Perfil"],["ponencias","Ponencias"],["votaciones","Votaciones"],["asistencia","Asistencia"]];

function openConcejal(id,fly=true){
  const i=CONCEJALES.findIndex(c=>c.id===id); if(i<0) return;
  currentIdx=i; panelMode="concejal"; const c=CONCEJALES[i], color=PARTIDOS[c.partido].color;
  const ph=$("#pPhoto");
  if(c.foto){ph.style.backgroundImage=`url("${c.foto}")`; ph.textContent="";}
  else{ph.style.backgroundImage="none"; ph.style.background=color; ph.textContent=initials(c.nombre);}
  $("#pName").textContent=c.nombre;
  $("#pParty").innerHTML=`<span class="dot" style="background:${color}"></span>${c.partido}`;
  $("#pRole").textContent=(CI.cargoDe(c.id)||"Concejal")+" · 2024–2027";
  $("#pPrev").hidden=$("#pNext").hidden=false;
  renderTabs(); renderTab();
  panel.hidden=false;
  setHover(id);
  if(fly) focusSeat(seats[i]);
}
function openMesa(){
  currentIdx=-1; panelMode="mesa";
  const m=CI.mesa();
  const ph=$("#pPhoto"); ph.style.backgroundImage="none"; ph.style.background="var(--accent)"; ph.textContent="MD";
  $("#pName").textContent="Mesa Directiva";
  $("#pParty").innerHTML=`<span class="dot" style="background:var(--accent)"></span>Dirección del Concejo`;
  $("#pRole").textContent="Se elige cada año (1 ene – 31 dic)";
  tabsEl.innerHTML=""; $("#pPrev").hidden=$("#pNext").hidden=true;
  pBody.innerHTML=`
    <dl class="facts">
      <dt>Presidente</dt>${m.presidente?`<dd>${m.presidente}</dd>`:`<dd class="pending">Por confirmar</dd>`}
      <dt>1.ª Vicepresidencia</dt>${m.vp1?`<dd>${m.vp1}</dd>`:`<dd class="pending">Por confirmar</dd>`}
      <dt>2.ª Vicepresidencia</dt>${m.vp2?`<dd>${m.vp2}</dd>`:`<dd class="pending">Por confirmar</dd>`}
      <dt>Secretaría General</dt>${m.secretario?`<dd>${m.secretario}</dd>`:`<dd class="pending">Por confirmar</dd>`}
    </dl>
    <h3>Cómo funciona el Concejo</h3>
    <dl class="facts">
      <dt>Concejales</dt><dd>13</dd>
      <dt>Quórum para deliberar</dt><dd>4 concejales (¼)</dd>
      <dt>Quórum para decidir</dt><dd>7 concejales (mayoría)</dd>
      <dt>Sesiones ordinarias</dt><dd>Febrero, mayo, agosto y noviembre</dd>
      <dt>Duración de sesión</dt><dd>Hasta 3 horas</dd>
    </dl>
    <h3>Comisiones permanentes</h3>
    <dl class="facts">
      <dt>Plan de Desarrollo</dt><dd>4 concejales</dd>
      <dt>Gobierno</dt><dd>4 concejales</dd>
      <dt>Presupuesto y Hacienda</dt><dd>5 concejales</dd>
    </dl>
    <p>La mesa no puede tener dos integrantes de la misma bancada, nadie repite el año siguiente y los partidos de oposición tienen derecho a la primera vicepresidencia.</p>
    <p class="note">Fuente: Reglamento interno, Acuerdo 018 de 2012 y Acuerdo 001 de 2013.</p>`;
  panel.hidden=false;
}
function openSecretaria(){
  currentIdx=-1; panelMode="secretaria";
  const m=CI.mesa();
  const ph=$("#pPhoto"); ph.style.backgroundImage="none"; ph.style.background="#7d1f2e"; ph.textContent="SG";
  $("#pName").textContent="Secretaría General";
  $("#pParty").innerHTML=`<span class="dot" style="background:#7d1f2e"></span>Concejo Municipal`;
  $("#pRole").innerHTML=m.secretario?m.secretario:"Titular por confirmar";
  tabsEl.innerHTML=""; $("#pPrev").hidden=$("#pNext").hidden=true;
  pBody.innerHTML=`
    <p>La elige la plenaria y no puede ser un concejal. Es la memoria del Concejo: da fe de lo que pasa en cada sesión.</p>
    <h3>Qué hace</h3>
    <ul style="margin:0 0 12px;padding-left:18px;display:flex;flex-direction:column;gap:6px">
      <li>Convoca las sesiones que autorizan el presidente y la mesa directiva.</li>
      <li>Llama a lista, lee los proyectos y documentos e informa el resultado de cada votación.</li>
      <li>Lleva y firma las actas, y certifica que lo escrito es fiel a lo ocurrido.</li>
      <li>Recibe y radica los proyectos de acuerdo y los reparte a la comisión que corresponde.</li>
      <li>Dirige y publica la Gaceta del Concejo.</li>
      <li>Lleva los libros de actas, de intereses privados de los concejales y de participación ciudadana.</li>
      <li>Graba las sesiones y conserva las grabaciones.</li>
    </ul>
    <p class="note">Fuente: Reglamento interno, artículos 40, 41 y 70; Acuerdo 001 de 2013.</p>`;
  panel.hidden=false;
}
function renderTabs(){
  tabsEl.innerHTML=TABS.map(([k,l])=>`<button class="tab" role="tab" type="button" data-k="${k}" aria-selected="${k===currentTab}">${l}</button>`).join("");
}
tabsEl.addEventListener("click",e=>{const b=e.target.closest(".tab"); if(!b) return; currentTab=b.dataset.k; renderTabs(); renderTab();});
function empty(title,text){return `<div class="empty"><strong>${title}</strong>${text}</div>`;}
function renderTab(){
  const c=CONCEJALES[currentIdx];
  const pend=v=>v?v:`<span class="pending">Por confirmar</span>`;
  if(currentTab==="perfil"){
    const hv=c.hojaDeVida;
    pBody.innerHTML=`
      <dl class="facts">
        <dt>Partido / bancada</dt><dd>${c.partido}</dd>
        <dt>Comisión permanente</dt><dd>${pend(CI.comisionDe(c.id))}</dd>
        <dt>Cargo</dt><dd>${CI.cargoDe(c.id)||"Concejal"}</dd>
        <dt>Período</dt><dd>2024 – 2027</dd>
      </dl>
      <h3>Hoja de vida</h3>
      ${hv? `<dl class="facts">${Object.entries(hv).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`
          : empty("Hoja de vida pendiente","Aquí irá un resumen corto: formación, experiencia y trayectoria en lo público.")}
      <p class="note">Para contactar al concejal, usa los canales oficiales del Concejo (PQRDS o Secretaría General).</p>`;
  } else if(currentTab==="ponencias"){
    const pr=CI.ponenciasDe(c.id);
    pBody.innerHTML = pr.length? listRows(pr)
      : empty("Sin ponencias cargadas","Aquí aparecerán los proyectos de acuerdo en los que fue ponente y en qué va cada uno: primer debate, segundo debate, aprobado o archivado.");
  } else if(currentTab==="votaciones"){
    const vr=CI.votacionesDe(c.id);
    pBody.innerHTML = vr.length? listRows(vr)
      : empty("Sin votaciones cargadas","Aquí aparecerá cómo votó (Sí / No) en cada votación nominal registrada en las actas.");
  } else {
    const as=CI.asistenciaDe(c.id);
    pBody.innerHTML = as? `<dl class="facts">${Object.entries(as).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`
      : empty("Sin asistencia cargada","Aquí aparecerán las sesiones a las que asistió en cada período (febrero, mayo, agosto y noviembre).");
  }
}
function listRows(rows){return `<div class="rows">${rows.map(r=>`<div class="row"><span class="row-date">${r.fecha||""}</span><span class="row-text">${r.texto}</span></div>`).join("")}</div>`;}
$("#pClose").addEventListener("click",()=>{panel.hidden=true; stopTour(); setHover(null);});
$("#pPrev").addEventListener("click",()=>{stopTour(); openConcejal(CONCEJALES[(currentIdx+12)%13].id);});
$("#pNext").addEventListener("click",()=>{stopTour(); openConcejal(CONCEJALES[(currentIdx+1)%13].id);});
document.addEventListener("keydown",e=>{
  if(!stage.offsetParent) return;
  if(e.key==="Escape"){panel.hidden=true; stopTour();}
  if(!panel.hidden&&currentIdx>=0&&(e.key==="ArrowRight"||e.key==="ArrowLeft")&&!e.target.closest("input")){
    stopTour(); openConcejal(CONCEJALES[(currentIdx+(e.key==="ArrowRight"?1:12))%13].id);
  }
});

/* ---------- Botones ---------- */
let tourTimer=null, tourIdx=0;
const btnTour=$("#btnTour");
function stopTour(){ if(tourTimer){clearInterval(tourTimer); tourTimer=null; btnTour.textContent="▶ Recorrido guiado";} }
btnTour.addEventListener("click",()=>{
  if(tourTimer){stopTour(); return;}
  btnTour.textContent="■ Detener recorrido";
  tourIdx=0; currentTab="perfil"; openConcejal(CONCEJALES[0].id);
  tourTimer=setInterval(()=>{tourIdx=(tourIdx+1)%13; openConcejal(CONCEJALES[tourIdx].id);},5000);
});
$("#btnHome").addEventListener("click",()=>{stopTour(); goTo(VIEWS.home);});
$("#btnPres").addEventListener("click",()=>{stopTour(); panel.hidden=true; goTo(VIEWS.pres);});
$("#btnList").addEventListener("click",()=>{stopTour(); showList();});
function showList(){
  currentIdx=-1; panelMode="lista";
  const ph=$("#pPhoto"); ph.style.backgroundImage="none"; ph.style.background="var(--accent)"; ph.textContent="13";
  $("#pName").textContent="Concejales 2024–2027";
  $("#pParty").innerHTML=`<span class="dot" style="background:var(--accent)"></span>10 partidos`;
  $("#pRole").textContent="Toca un nombre para ir a su curul";
  tabsEl.innerHTML=""; $("#pPrev").hidden=$("#pNext").hidden=true;
  pBody.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px">${CONCEJALES.map(c=>
    `<button class="chip" type="button" data-id="${c.id}" style="justify-content:flex-start;border-radius:10px;padding:9px 12px"><span class="dot" style="background:${PARTIDOS[c.partido].color}"></span><span style="text-align:left"><b style="font-weight:700">${c.nombre}</b><br><span style="color:var(--muted);font-size:12.5px">${c.partido}</span></span></button>`).join("")}</div>`;
  panel.hidden=false;
}
pBody.addEventListener("click",e=>{const b=e.target.closest("[data-id]"); if(b){currentTab="perfil"; openConcejal(b.dataset.id);}});

/* ---------- Render ---------- */
function resize(){
  const w=stage.clientWidth, h=stage.clientHeight; if(!w||!h) return;
  renderer.setSize(w,h,false); camera.aspect=w/h;
  camera.fov = w<700? 58:45; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock=new THREE.Clock();
const flagData=flags.map(f=>({pos:f.geometry.attributes.position, base:f.geometry.attributes.position.array.slice()}));
function tick(){
  const t=clock.getElapsedTime();
  if(fly){
    const k=reduce?1:.06;
    camera.position.lerp(fly.pos,k); controls.target.lerp(fly.target,k);
    if(camera.position.distanceTo(fly.pos)<.02) fly=null;
  }
  if(!reduce){ // ondear la bandera
    flagData.forEach(({pos,base})=>{ // mismo movimiento para las tres
      for(let i=0;i<pos.count;i++){const x=base[i*3]+FLAG_W/2, y=FLAG_H/2-base[i*3+1];
        pos.setZ(i,(Math.sin(x*7-t*2.4+y*1.5)*.045*x/FLAG_W + Math.sin(t*1.1+y*.8)*.03*y/FLAG_H));}
      pos.needsUpdate=true;
    });
  }
  if(stage.offsetParent){ controls.update(); renderer.render(scene,camera); }
  requestAnimationFrame(tick);
}
tick();
