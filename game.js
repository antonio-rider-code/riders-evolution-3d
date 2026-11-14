(() => {
'use strict';

/* ---------- Уровни ---------- */
const STAGES = [
  {name:'Осьминожки', k:0.07, one:'Осьминожка', slope:'Детский склон', sc:'#1fb873', goal:20, v:230, hw:140, A:80, L:260, gap:340,
   text:'Знакомимся с лыжами и учимся тормозить «плугом».',
   hint:'Веди пальцем влево-вправо — лыжник поедет туда же. Собирай звёзды, объезжай конусы!',
   first:'stars', w:{stars:5, cone:3}},
  {name:'Змейки', k:0.07, one:'Змейка', slope:'Детский склон', sc:'#1fb873', goal:30, v:255, hw:132, A:105, L:250, gap:320,
   text:'Рисуем змейку: повороты «плугом» один за другим.',
   hint:'Проезжай между флажками — это ворота!',
   first:'gate', w:{stars:3, cone:2, gate:5}},
  {name:'Саблезубые зайцы', k:0.15, one:'Саблезубый заяц', slope:'Зелёный склон', sc:'#1fb873', goal:35, v:285, hw:126, A:120, L:260, gap:310,
   text:'Склон круче — повороты увереннее.',
   hint:'Трамплин! Пока летишь, коснись экрана — получится трюк.',
   first:'kicker', w:{stars:3, cone:2, gate:2, tree:3, kicker:3}},
  {name:'Реактивные лисы', k:0.15, one:'Реактивный лис', slope:'Зелёный склон', sc:'#1fb873', goal:40, v:320, hw:122, A:135, L:270, gap:300,
   text:'Первый карвинг на зелёном склоне.',
   hint:'Жёлтые стрелки дают ускорение и двойные звёзды!',
   first:'boost', w:{stars:3, cone:2, gate:3, tree:2, kicker:2, boost:3}},
  {name:'Снежные барсы', k:0.15, one:'Снежный барс', slope:'Зелёный склон', sc:'#1fb873', goal:50, v:350, hw:114, A:150, L:280, gap:290,
   text:'Повороты на параллельных лыжах.',
   hint:'Трасса стала у́же и быстрее. Держись синей ленты!',
   first:'gate', w:{stars:2, cone:2, gate:4, tree:4, kicker:2, boost:2}},
  {name:'Горные акулы', k:0.25, one:'Горная акула', slope:'Синий склон', sc:'#2f6bff', goal:55, v:380, hw:114, A:150, L:280, gap:280,
   text:'Синие склоны и первые бугры.',
   hint:'Бугры подбрасывают — держи равновесие!',
   first:'bump', w:{stars:2, cone:1, gate:2, tree:3, bump:5, kicker:2, boost:1}},
  {name:'Супер-бизоны', k:0.35, one:'Супер-бизон', slope:'Красный склон', sc:'#ff4d5e', goal:65, v:410, hw:128, A:130, L:300, gap:270,
   text:'Красные склоны и трюки в лыжном парке.',
   hint:'Это парк! Успей сделать два трюка за один прыжок.',
   first:'kicker', w:{stars:2, cone:2, gate:2, tree:1, kicker:6, boost:2}},
  {name:'Снежные люди', k:0.46, one:'Снежный человек', slope:'Вне трасс', sc:'#15102e', goal:75, v:440, hw:165, A:110, L:310, gap:260,
   text:'Любые трассы, парк и свежий снег вне трасс.',
   hint:'Вне трасс — лес. Ищи проход между ёлками!',
   first:'tree', w:{stars:2, tree:7, kicker:3, bump:2, gate:1, boost:1}},
];

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

if (typeof THREE === 'undefined') {
  document.querySelector('.sub').textContent = 'Не получилось загрузить 3D-движок. Проверь интернет и обнови страницу.';
  $('btnPlay').disabled = true; return;
}

/* ---------- Сохранение ---------- */
let maxStage = 1;
try { maxStage = Math.min(8, Math.max(1, +localStorage.getItem('ridersEvo.max') || 1)); } catch (e) {}
const saveMax = () => { try { localStorage.setItem('ridersEvo.max', maxStage); } catch (e) {} };

/* ---------- Звук ---------- */
let actx = null, soundOn = true;
function beep(f, dur, type = 'sine', vol = .12, to = null) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const sfx = {
  star: () => beep(880, .09, 'triangle', .1, 1320),
  gate: () => { beep(660, .08, 'triangle'); setTimeout(() => beep(990, .12, 'triangle'), 70); },
  jump: () => beep(300, .25, 'sine', .12, 800),
  trick: () => { beep(700, .08, 'square', .06); setTimeout(() => beep(1050, .14, 'square', .06), 80); },
  land: () => beep(160, .1, 'sine', .14, 90),
  crash: () => beep(220, .35, 'sawtooth', .1, 60),
  boost: () => beep(400, .3, 'sawtooth', .06, 1200),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .18, 'triangle', .12), i * 110)),
};

/* =====================================================================
   3D-СЦЕНА
   ===================================================================== */
const app = $('app'), cv = $('c');
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const HORIZON = '#8a76f2';

const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(C(HORIZON), 1300, 3600);
const camera = new THREE.PerspectiveCamera(68, 1, 10, 14000);
const world = new THREE.Group(); world.matrixAutoUpdate = false; scene.add(world);   // склон: y уходит вниз с расстоянием

function resize() {
  const r = app.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---- свет ---- */
scene.add(new THREE.HemisphereLight(C('#d6ccff'), C('#7d6fd0'), .95));
const sun = new THREE.DirectionalLight(C('#ffe0cc'), .85);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 1500, bottom: -700, near: 100, far: 4200 });
sun.shadow.bias = -.0006; sun.shadow.normalBias = 1.5;
scene.add(sun, sun.target);

/* ---- вспомогательное: текстуры из canvas ---- */
function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ---- геометрия с цветами вершин и склейка ---- */
function paint(geo, colorAt) {            // colorAt(centroidY, normalizedY) -> hex
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeBoundingBox();
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const y0 = g.boundingBox.min.y, h = (g.boundingBox.max.y - y0) || 1, c = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    c.set(colorAt(cy, (cy - y0) / h)).convertSRGBToLinear();
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), K = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, o); N.set(g.attributes.normal.array, o); K.set(g.attributes.color.array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.BufferAttribute(K, 3));
  return out;
}
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });

/* ---- небо ---- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { hor: { value: new THREE.Color(HORIZON) }, mid: { value: new THREE.Color('#3a2a8a') }, top: { value: new THREE.Color('#150c3c') }, glow: { value: new THREE.Color('#ff9fc0') } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 d; uniform vec3 hor, mid, top, glow;
      void main(){ float h = max(d.y, 0.);
        vec3 c = mix(hor, mid, smoothstep(0., .22, h)); c = mix(c, top, smoothstep(.18, .75, h));
        float g = pow(max(dot(normalize(d), normalize(vec3(-.42, .1, -.9))), 0.), 6.);
        c = mix(c, glow, g * .55 * (1. - smoothstep(0., .45, h)));
        gl_FragColor = vec4(c, 1.); }`,
  }));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

/* звёзды на небе */
{
  const n = 420, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), e = rand(.12, 1.45), r = 8200;
    p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false, transparent: true, opacity: .8, depthWrite: false }));
  m.renderOrder = -9; m.frustumCulled = false; sky.add(m);
}
/* солнце у горизонта */
const glowTex = canvasTex(256, 256, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,244,226,1)'); r.addColorStop(.16, 'rgba(255,214,190,.95)'); r.addColorStop(.3, 'rgba(255,150,190,.45)'); r.addColorStop(1, 'rgba(255,150,190,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, fog: false, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, transparent: true }));
sunSprite.scale.set(2600, 2600, 1); sunSprite.position.set(-3300, 820, -7000); sunSprite.renderOrder = -8; sky.add(sunSprite);

/* ---- горы ---- */
const mountains = new THREE.Group(); scene.add(mountains);
{
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, fog: false });
  const parts = [];
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI / 2 + (i / 21 - .5) * Math.PI * 1.5 + rand(-.05, .05);
    const far = i % 2, R = far ? rand(6200, 7000) : rand(4700, 5400), h = far ? rand(1500, 2300) : rand(800, 1400), w = h * rand(.9, 1.3);
    let g = new THREE.ConeGeometry(w, h, 6 + (i % 3), 4);
    const pp = g.attributes.position;
    for (let k = 0; k < pp.count; k++) {             // лёгкая неровность склонов
      const y = pp.getY(k); if (y > h / 2 - 1) continue;
      pp.setX(k, pp.getX(k) * (1 + (hash(i * 31 + k) - .5) * .35)); pp.setZ(k, pp.getZ(k) * (1 + (hash(i * 17 + k * 3) - .5) * .35));
    }
    g = paint(g, (cy, t) => t > .62 ? '#f4f0ff' : t > .42 ? (far ? '#8f80e6' : '#6d5bd0') : t > .2 ? (far ? '#6a58cc' : '#43318f') : (far ? '#7a67de' : '#5a48b8'));
    g.computeVertexNormals();
    g.rotateY(rand(0, 6)); g.translate(Math.cos(a) * R, h / 2 - 260, Math.sin(a) * R);
    parts.push(g);
  }
  mountains.add(new THREE.Mesh(merge(parts), mat));
}

/* ---- снег ---- */
const TILE = 400;
const snowTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},255,${rand(.04, .16)})`; g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(1, 7), 0, 7); g.fill(); }
});
snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.repeat.set(12000 / TILE, 12000 / TILE);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshLambertMaterial({ color: C('#ffffff'), map: snowTex }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

/* ---- трасса: синяя лента ---- */
const SEG = 150, STEP = 30;
const mkPisteTex = (edge, edge2) => { const t = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#2f6bff'; g.fillRect(0, 0, w, h);
  for (let x = 26; x < w - 26; x += 6) { g.fillStyle = `rgba(255,255,255,${.05 + .05 * Math.random()})`; g.fillRect(x, 0, 2, h); }
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, 0, w, 26);
  g.fillStyle = 'rgba(10,30,120,.10)'; g.fillRect(0, h / 2, w, 26);
  g.fillStyle = edge; g.fillRect(0, 0, 20, h); g.fillRect(w - 20, 0, 20, h);
  g.fillStyle = edge2; g.fillRect(20, 0, 5, h); g.fillRect(w - 25, 0, 5, h);
}); t.wrapT = THREE.RepeatWrapping; return t; };
const PISTE_TEX = { '#1fb873': mkPisteTex('#1fb873', '#ffffff'), '#2f6bff': mkPisteTex('#ffffff', '#9db8ff'), '#ff4d5e': mkPisteTex('#ff4d5e', '#ffffff'), '#15102e': mkPisteTex('#15102e', '#ffffff') };
const pisteTex = PISTE_TEX['#1fb873'];
const pisteGeo = new THREE.BufferGeometry();
{
  const n = (SEG + 1) * 2, idx = [];
  pisteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  pisteGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const nor = new Float32Array(n * 3); for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1;
  pisteGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  pisteGeo.setIndex(idx);
}
const piste = new THREE.Mesh(pisteGeo, new THREE.MeshLambertMaterial({ map: pisteTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
piste.frustumCulled = false; piste.receiveShadow = true; world.add(piste);

/* ---- ёлки ---- */
function treeGeo() {
  const seg = 9, parts = [];
  const trunk = paint(new THREE.CylinderGeometry(6, 9, 34, 7), () => '#6b4226'); trunk.translate(0, 17, 0); parts.push(trunk);
  [[46, 78, 62], [36, 66, 104], [25, 54, 142]].forEach(([r, h, y], i) => {
    const g = paint(new THREE.ConeGeometry(r, h, seg, 3), (cy, t) => t > .5 ? '#ffffff' : t > .3 ? '#cfeee0' : (i % 2 ? '#15935b' : '#1fb873'));
    g.rotateY(i * .5); g.translate(0, y, 0); parts.push(g);
  });
  return merge(parts);
}
const TREE = treeGeo();
const NDECO = 110, DSTEP = 62;
const deco = new THREE.InstancedMesh(TREE, vcMat, NDECO);
deco.castShadow = true; deco.frustumCulled = false; world.add(deco);

/* сугробы вне трассы */
const NMOUND = 40, MSTEP = 150;
const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: C('#ffffff') }), NMOUND);
mounds.receiveShadow = true; mounds.frustumCulled = false; world.add(mounds);

/* вешки по краям трассы — в цвет склона */
const NPOLE = 26, PSTEP = 170;
const poleMat = new THREE.MeshLambertMaterial({ color: C('#1fb873') });
const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(3.2, 3.2, 62, 8), poleMat, NPOLE * 2);
poles.castShadow = true; poles.frustumCulled = false; world.add(poles);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

/* ---- заготовки объектов ---- */
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 24; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 7, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2.5, bevelSegments: 2 });
  g.translate(0, 0, -3.5); return g;
})();
const starMat = new THREE.MeshStandardMaterial({ color: C('#ffd23f'), emissive: C('#ff9a00'), emissiveIntensity: .55, metalness: .35, roughness: .3 });
const starGlow = new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,220,90,.75)'); r.addColorStop(1, 'rgba(255,220,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }), depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });

const coneGeo = (() => {
  const body = paint(new THREE.CylinderGeometry(4, 19, 54, 14, 6), (cy, t) => (t > .28 && t < .45) || (t > .62 && t < .8) ? '#ffffff' : '#ff6a2b'); body.translate(0, 31, 0);
  const base = paint(new THREE.BoxGeometry(46, 5, 46), () => '#ff6a2b'); base.translate(0, 2.5, 0);
  return merge([body, base]);
})();
const poleGeo = new THREE.CylinderGeometry(2.6, 2.6, 96, 8); poleGeo.translate(0, 48, 0);
const whiteMat = new THREE.MeshLambertMaterial({ color: C('#ffffff') });
const flagGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 96, 0, 0, 62, 0, 40, 79, 0]), 3)); g.computeVertexNormals(); return g; })();
const kickerGeo = (() => {
  const w = 54, l = 50, h = 40;                    // въезд со стороны камеры (+z), кромка впереди (-z)
  const v = [[-w, 0, l], [w, 0, l], [w, h, -l], [-w, h, -l], [-w, 0, -l], [w, 0, -l]];
  const tri = [[0, 1, 2], [0, 2, 3], [3, 2, 5], [3, 5, 4], [0, 3, 4], [1, 5, 2]];
  const p = []; tri.forEach(t => t.forEach(i => p.push(...v[i])));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3)); g.computeVertexNormals();
  const col = new Float32Array(p.length), a = C('#ffffff'), b = C('#a9c2ff');
  for (let i = 0; i < p.length / 3; i++) { const c = i < 6 ? a : b; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
})();
const chevTex = color => canvasTex(128, 128, (g) => {
  g.strokeStyle = color; g.lineWidth = 15; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const y of [100, 62, 24]) { g.beginPath(); g.moveTo(26, y + 16); g.lineTo(64, y - 14); g.lineTo(102, y + 16); g.stroke(); }
});
const kickDecal = new THREE.MeshBasicMaterial({ map: chevTex('#2f6bff'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const boostTex = chevTex('#ffd23f');
const decalGeo = new THREE.PlaneGeometry(1, 1);
const bumpGeo = new THREE.SphereGeometry(34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); bumpGeo.scale(1, .5, 1);

function mk(o) {
  let m;
  if (o.t === 'star') {
    m = new THREE.Group();
    const s = new THREE.Mesh(starGeo, starMat); s.castShadow = true; m.add(s);
    const gl = new THREE.Sprite(starGlow); gl.scale.set(110, 110, 1); m.add(gl);
    m.position.set(o.x, o.y || 42, -o.d);
  } else if (o.t === 'cone') {
    m = new THREE.Mesh(coneGeo, vcMat); m.castShadow = true; m.position.set(o.x, 0, -o.d);
  } else if (o.t === 'tree') {
    m = new THREE.Mesh(TREE, vcMat); m.castShadow = true; m.position.set(o.x, 0, -o.d);
    m.scale.setScalar(rand(.95, 1.15)); m.rotation.y = rand(0, 6);
  } else if (o.t === 'gate') {
    m = new THREE.Group(); o.flags = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(poleGeo, whiteMat); p.castShadow = true; p.position.x = s * o.half; m.add(p);
      const fm = new THREE.MeshLambertMaterial({ color: C(s < 0 ? '#ff4d5e' : '#ffd23f'), side: THREE.DoubleSide });
      const f = new THREE.Mesh(flagGeo, fm); f.castShadow = true; f.position.x = s * o.half; f.scale.x = -s; m.add(f); o.flags.push(fm);
    }
    m.position.set(o.x, 0, -o.d);
  } else if (o.t === 'kicker') {
    m = new THREE.Group();
    const w = new THREE.Mesh(kickerGeo, vcMat); w.castShadow = true; w.receiveShadow = true; m.add(w);
    const d = new THREE.Mesh(decalGeo, kickDecal); d.scale.set(76, 76, 1); d.rotation.x = -Math.PI / 2 + Math.atan2(40, 100); d.position.set(0, 21.5, 0); m.add(d);
    m.position.set(o.x, 0, -o.d);
  } else if (o.t === 'bump') {
    m = new THREE.Mesh(bumpGeo, whiteMat); m.castShadow = true; m.receiveShadow = true; m.position.set(o.x, 0, -o.d);
  } else if (o.t === 'boost') {
    o.mat = new THREE.MeshBasicMaterial({ map: boostTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    m = new THREE.Mesh(decalGeo, o.mat); m.scale.set(100, 130, 1); m.rotation.x = -Math.PI / 2; m.position.set(o.x, 1.5, -o.d);
  }
  o.mesh = m; world.add(m);
}
function rm(o) { if (o.mesh) { world.remove(o.mesh); o.mesh = null; } if (o.flags) o.flags.forEach(f => f.dispose()); if (o.mat) o.mat.dispose(); }

/* ---- лыжник: маскот-спрайт ---- */
const loader = new THREE.TextureLoader();
const heroTex = STAGES.map((_, i) => { const t = loader.load(`img/m${i + 1}.png`); t.encoding = THREE.sRGBEncoding; return t; });
const HERO = 118;
const hero = new THREE.Sprite(new THREE.SpriteMaterial({ map: heroTex[0], transparent: true, alphaTest: .02 }));
hero.renderOrder = 5; world.add(hero);
const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x0a0a40, transparent: true, opacity: .32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
blob.rotation.x = -Math.PI / 2; world.add(blob);
/* кольцо «сколько осталось лететь» */
const ringCv = document.createElement('canvas'); ringCv.width = ringCv.height = 128;
const ringTex = new THREE.CanvasTexture(ringCv);
const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthTest: false, depthWrite: false }));
ring.scale.set(180, 180, 1); ring.renderOrder = 6; ring.visible = false; world.add(ring);
function drawRing(f) {
  const g = ringCv.getContext('2d'); g.clearRect(0, 0, 128, 128); g.lineWidth = 7; g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
  g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(64, 64, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
  ringTex.needsUpdate = true;
}

/* ---- частицы: снежная пыль из-под лыж ---- */
const NP = 220, pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP);
for (let i = 0; i < NP; i++) pPos[i * 3 + 1] = -9999;
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const dotTex = canvasTex(32, 32, g => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
const spray = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: dotTex, size: 15, transparent: true, opacity: .85, depthWrite: false, color: 0xffffff }));
spray.frustumCulled = false; spray.renderOrder = 4; world.add(spray);
let pNext = 0;
function emit(x, y, z, vx, vy, vz, life) {
  const i = pNext; pNext = (pNext + 1) % NP;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz; pLife[i] = life;
}
/* ---- снегопад ---- */
const NF = 700, fBase = new Float32Array(NF * 3), fPos = new Float32Array(NF * 3);
for (let i = 0; i < NF; i++) { fBase[i * 3] = rand(-900, 900); fBase[i * 3 + 1] = rand(0, 800); fBase[i * 3 + 2] = rand(0, 2400); }
const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
const flakes = new THREE.Points(fGeo, new THREE.PointsMaterial({ map: dotTex, size: 9, transparent: true, opacity: .85, depthWrite: false, color: 0xffffff }));
flakes.frustumCulled = false; flakes.renderOrder = 3; world.add(flakes);

/* =====================================================================
   ИГРА
   ===================================================================== */
let CAM_H = 285, CAM_HK = 200, CAM_F = .7, SKY_T = .7;
let state = 'menu', stage = 1, S = STAGES[0];
let dist = 0, speed = 0, px = 0, target = 0, lean = 0;
let hearts = 3, points = 0, objs = [], nextSpawn = 0, firstDone = false;
let air = null, inv = 0, boostT = 0, shake = 0, overT = 0, offT = 0, time = 0, tricksDone = 0;
let camX = 0, lookX = 0, fov = 68, kSlope = .07;

const cx = d => S.A * (.72 * Math.sin(d / S.L) + .28 * Math.sin(d / (S.L * .37)));

function show(id) {
  ['menu', 'levelup', 'over', 'final'].forEach(k => $(k).classList.toggle('on', k === id));
  $('hud').classList.toggle('hidden', id === 'menu' || id === 'final');
}
function startStage(n) {
  objs.forEach(rm);
  stage = n; S = STAGES[n - 1]; state = 'play';
  dist = 0; speed = S.v * .35; px = target = camX = lookX = 0; lean = 0;
  hearts = 3; points = 0; objs = [];
  air = null; inv = 0; boostT = 0; shake = 0; overT = 0; offT = 0; firstDone = false;
  nextSpawn = 800;
  hero.material.map = heroTex[n - 1]; hero.material.needsUpdate = true;
  poleMat.color.copy(C(S.sc === '#15102e' ? '#2b1b63' : S.sc));
  piste.material.map = PISTE_TEX[S.sc]; piste.material.needsUpdate = true; kSlope = S.k;
  show(null); hud();
  const h = $('hint'); h.textContent = S.hint; h.classList.add('on');
  clearTimeout(startStage.t); startStage.t = setTimeout(() => h.classList.remove('on'), 5200);
}
function hud() {
  $('hudImg').src = `img/m${stage}.png`;
  $('hudName').textContent = S.name;
  const sl = $('hudSlope'); sl.textContent = S.slope; sl.style.background = S.sc;
  $('barFill').style.width = clamp(points / S.goal * 100, 0, 100) + '%';
  $('barText').textContent = `★ ${Math.min(points, S.goal)} / ${S.goal}`;
  $('hearts').textContent = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts);
}

/* ---------- Генерация трассы ---------- */
function pick() {
  if (!firstDone) { firstDone = true; return S.first; }
  let tot = 0; for (const k in S.w) tot += S.w[k];
  let r = Math.random() * tot;
  for (const k in S.w) { r -= S.w[k]; if (r <= 0) return k; }
  return 'stars';
}
function put(o) { objs.push(o); mk(o); }
const star = (d, x, y) => put({ t: 'star', d, x, y });
function spawn(d) {
  const type = pick(), hw = S.hw, c = cx(d);
  if (type === 'stars') {
    const f = rand(-.6, .6), n = 3 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) star(d + i * 72, cx(d + i * 72) + f * hw + Math.sin(i * .9) * 18);
    return n * 72;
  }
  if (type === 'cone') {
    const f = rand(-.7, .7), s = Math.abs(f) < .2 ? (Math.random() < .5 ? -1 : 1) : Math.sign(f);
    put({ t: 'cone', d, x: c + f * hw });
    star(d, c - s * .5 * hw); star(d + 72, cx(d + 72) - s * .4 * hw);
    return 100;
  }
  if (type === 'gate') {
    const f = rand(-.45, .45);
    put({ t: 'gate', d, x: c + f * hw, half: 62 }); star(d + 6, c + f * hw);
    return 60;
  }
  if (type === 'tree') {
    const g = c + rand(-.5, .5) * hw, sp = stage >= 8 ? 84 : 92;
    if (stage >= 5 || Math.random() < .5) {
      put({ t: 'tree', d, x: g - sp }); put({ t: 'tree', d: d + rand(-20, 20), x: g + sp }); star(d, g);
    } else {
      put({ t: 'tree', d, x: g }); star(d, g + (g > c ? -1 : 1) * 90);
    }
    return 80;
  }
  if (type === 'kicker') {
    const x = c + rand(-.35, .35) * hw, T = stage >= 7 ? 1.35 : 1.05, fl = S.v * T;
    put({ t: 'kicker', d, x, half: 56, T });
    for (const f of (stage >= 7 ? [.25, .5, .75] : [.33, .66])) star(d + fl * f, x, 46 + 96 * Math.sin(Math.PI * f));
    return fl + 120;
  }
  if (type === 'bump') {
    const skip = Math.random() * 3 | 0, fs = [-.55, 0, .55];
    fs.forEach((f, i) => { if (i !== skip) put({ t: 'bump', d: d + rand(-12, 12), x: c + f * hw }); });
    star(d + 110, cx(d + 110) + fs[skip] * hw);
    return 140;
  }
  // boost
  const x = c + rand(-.45, .45) * hw;
  put({ t: 'boost', d, x, half: 50 });
  for (let i = 1; i <= 3; i++) star(d + 70 + i * 90, cx(d + 70 + i * 90) + (x - c) * .6);
  return 380;
}

/* ---------- События ---------- */
function pop(text, color = '#fff') {
  const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color;
  $('pops').appendChild(el); setTimeout(() => el.remove(), 1000);
}
function add(n, text, color) {
  points += n; if (text) pop(text, color); hud();
  if (points >= S.goal && state === 'play') win();
}
function win() {
  sfx.win();
  if (stage >= 8) { maxStage = 8; saveMax(); state = 'final'; buildMenu(); show('final'); return; }
  maxStage = Math.max(maxStage, stage + 1); saveMax();
  state = 'levelup';
  const nx = STAGES[stage];
  $('luImg').src = `img/m${stage + 1}.png`; $('luImg').alt = nx.one;
  $('luName').textContent = nx.one + '!'; $('luText').textContent = nx.text;
  const im = $('luImg'); im.style.animation = 'none'; void im.offsetWidth; im.style.animation = '';
  show('levelup');
}
function burst(n, sp) { for (let i = 0; i < n; i++) emit(px + rand(-20, 20), rand(5, 50), -dist + rand(-10, 10), rand(-sp, sp), rand(40, sp * 1.3), rand(-sp, sp * .4) - speed * .5, rand(.35, .8)); }
function crash(msg = 'Ой!') {
  if (inv > 0) return;
  hearts--; inv = 1.8; speed *= .3; shake = .4; boostT = 0; air = null;
  sfx.crash(); pop(msg, '#ff8f9a'); hud(); burst(34, 190);
  if (hearts <= 0) overT = .9;
}
function jump(T, small) { air = { t: 0, T, small, spin: null, tricks: 0, kind: 0 }; small ? beep(260, .12, 'sine', .1, 520) : sfx.jump(); }
function trick() {
  if (state !== 'play' || !air || air.small || air.spin !== null) return;
  air.spin = 0; air.kind = tricksDone++ % 2; sfx.trick();
}

/* ---------- Шаг игры ---------- */
function update(dt) {
  time += dt;
  if (state !== 'play') return;
  if (overT > 0) { overT -= dt; if (overT <= 0) { state = 'over'; $('ovImg').src = `img/m${stage}.png`; show('over'); } }

  const c0 = cx(dist);
  if (keys.l) target -= 430 * dt; if (keys.r) target += 430 * dt;
  target = clamp(target, c0 - S.hw - 55, c0 + S.hw + 55);

  const off = Math.abs(px - c0) > S.hw + 8;
  offT = off && !air ? offT + dt : 0;
  $('off').classList.toggle('on', offT > .4);
  const want = hearts <= 0 ? 0 : S.v * (off && !air ? .5 : 1) * (boostT > 0 ? 1.45 : 1);
  speed += (want - speed) * Math.min(1, dt * (want > speed ? 1.5 : 4));
  const step = speed * dt; dist += step;

  const dx = clamp((target - px) * 12 * dt, -540 * dt, 540 * dt);
  px += dx; lean += (clamp(dx / dt / 540, -1, 1) - lean) * Math.min(1, dt * 9);

  if (inv > 0) inv -= dt;
  if (boostT > 0) boostT -= dt;
  if (shake > 0) shake -= dt;

  if (air) {
    air.t += dt;
    if (air.spin !== null) {
      air.spin += dt / .45;
      if (air.spin >= 1) { air.spin = null; air.tricks++; add(air.tricks > 1 ? 5 : 3, air.tricks > 1 ? 'Двойной трюк! +5' : 'Трюк 360! +3', '#ffd23f'); }
    }
    if (air && air.t >= air.T) {
      const bad = air.spin !== null && air.spin < .75, done = air.spin !== null && !bad;
      air = null;
      if (bad) crash('Не докрутил!');
      else { sfx.land(); burst(16, 120); if (done) add(3, 'Трюк 360! +3', '#ffd23f'); }
    }
  } else if (speed > 60) {
    const k = Math.abs(lean), n = k > .35 ? 3 : (Math.random() < .5 ? 1 : 0);   // пыль из-под лыж, в повороте — веер
    for (let i = 0; i < n; i++) emit(px + rand(-22, 22) - Math.sign(lean) * 18, 4, -dist + rand(0, 26), -lean * rand(60, 260) + rand(-25, 25), rand(30, 70 + k * 190), rand(60, 190), rand(.25, .6));
  }

  while (nextSpawn < dist + 3300) nextSpawn += spawn(nextSpawn) + S.gap * rand(.8, 1.15);

  const ground = !air;
  for (const o of objs) {
    const dy = o.d - dist, ax = Math.abs(o.x - px), near = a => Math.abs(dy) < a + step;
    if (o.t === 'star') {
      if (!o.got && near(34) && ax < 44) { o.got = true; sfx.star(); add(boostT > 0 ? 2 : 1, boostT > 0 ? '+2' : '+1', '#ffd23f'); for (let i = 0; i < 6; i++) emit(o.x, o.mesh.position.y, -o.d, rand(-90, 90), rand(20, 150), rand(-90, 90) - speed * .6, .4); }
    } else if (o.t === 'cone') {
      if (ground && inv <= 0 && near(16) && ax < 34) crash();
    } else if (o.t === 'tree') {
      if (ground && inv <= 0 && near(20) && ax < 44) crash();
    } else if (o.t === 'gate') {
      if (!o.done && dy < 0) { o.done = true; if (ax < o.half) { sfx.gate(); o.flags.forEach(f => f.color.copy(C('#5dffa6'))); add(2, 'Ворота! +2', '#7dffb8'); } }
    } else if (o.t === 'kicker') {
      if (ground && !o.used && near(30) && ax < o.half) { o.used = true; jump(o.T, false); }
    } else if (o.t === 'bump') {
      if (ground && !o.used && near(16) && ax < 36) { o.used = true; jump(.38, true); }
    } else if (o.t === 'boost') {
      if (ground && !o.used && near(40) && ax < o.half) { o.used = true; boostT = 2.6; sfx.boost(); pop('Ускорение!', '#ffd23f'); }
    }
  }
  objs = objs.filter(o => { if (o.d - dist < -380 || (o.t === 'star' && o.got)) { rm(o); return false; } return true; });
}

/* ---------- Синхронизация сцены ---------- */
function sync(dt) {
  const z = -dist;
  // лента трассы
  const P = pisteGeo.attributes.position.array, U = pisteGeo.attributes.uv.array, d0 = Math.floor((dist - 520) / STEP) * STEP;
  for (let i = 0; i <= SEG; i++) {
    const d = d0 + i * STEP, c = cx(d), a = i * 6, u = i * 4;
    P[a] = c - S.hw; P[a + 1] = 1; P[a + 2] = -d; P[a + 3] = c + S.hw; P[a + 4] = 1; P[a + 5] = -d;
    U[u] = 0; U[u + 1] = d / 320; U[u + 2] = 1; U[u + 3] = d / 320;
  }
  pisteGeo.attributes.position.needsUpdate = true; pisteGeo.attributes.uv.needsUpdate = true;

  ground.position.set(Math.round(px / TILE) * TILE, 0, -Math.round(dist / TILE) * TILE - 3500);

  // лес по сторонам
  const cell0 = Math.floor((dist - 420) / DSTEP);
  for (let i = 0; i < NDECO; i++) {
    const k = cell0 + i, d = k * DSTEP + hash(k * 3.1) * 50, side = hash(k * 7.7) < .5 ? -1 : 1, far = hash(k * 1.3);
    const x = cx(d) + side * (S.hw + 95 + far * far * 1500), s = .85 + hash(k * 5.9) * 1.0;
    V1.set(x, 0, -d); Q.setFromAxisAngle(V2.set(0, 1, 0), hash(k) * 6); V2.set(s, s * (0.9 + hash(k * 2.3) * .4), s);
    deco.setMatrixAt(i, M4.compose(V1, Q, V2));
  }
  deco.instanceMatrix.needsUpdate = true;
  const mc0 = Math.floor((dist - 420) / MSTEP);
  for (let i = 0; i < NMOUND; i++) {
    const k = mc0 + i, d = k * MSTEP + hash(k * 4.4) * 120, side = hash(k * 9.1) < .5 ? -1 : 1;
    V1.set(cx(d) + side * (S.hw + 70 + hash(k * 6.3) * 900), -4, -d); Q.identity(); const r = 50 + hash(k * 8.8) * 110; V2.set(r, r * .28, r * .8);
    mounds.setMatrixAt(i, M4.compose(V1, Q, V2));
  }
  mounds.instanceMatrix.needsUpdate = true;
  const pc0 = Math.floor((dist - 420) / PSTEP);
  for (let i = 0; i < NPOLE; i++) {
    const d = (pc0 + i) * PSTEP, c = cx(d); Q.identity(); V2.set(1, 1, 1);
    poles.setMatrixAt(i * 2, M4.compose(V1.set(c - S.hw - 10, 31, -d), Q, V2));
    poles.setMatrixAt(i * 2 + 1, M4.compose(V1.set(c + S.hw + 10, 31, -d), Q, V2));
  }
  poles.instanceMatrix.needsUpdate = true;

  // объекты
  for (const o of objs) {
    if (o.t === 'star') { o.mesh.rotation.y = time * 3 + o.d; o.mesh.position.y = (o.y || 42) + Math.sin(time * 4 + o.d) * 5; }
    else if (o.t === 'boost') o.mat.opacity = .55 + .45 * Math.abs(Math.sin(time * 6));
  }

  // лыжник
  let h = 0, rot = -lean * .3, sx = 1;
  if (air) {
    h = Math.sin(Math.PI * air.t / air.T) * (air.small ? .3 : 1);
    if (air.spin !== null) { if (air.kind) rot += air.spin * Math.PI * 2; else sx = Math.cos(air.spin * Math.PI * 2); }
  }
  const im = heroTex[stage - 1].image, ar = im && im.height ? im.width / im.height : 1;
  const w = ar >= 1 ? HERO : HERO * ar, hh = ar >= 1 ? HERO / ar : HERO;
  hero.scale.set(w * sx * (1 + .1 * h), hh * (1 + .1 * h), 1);
  hero.position.set(px, hh * .46 + h * 105, z);
  hero.material.rotation = rot;
  hero.visible = !(inv > 0 && Math.floor(inv * 12) % 2);
  hero.material.color.setScalar(boostT > 0 ? 1.25 : 1);
  blob.position.set(px, 1.5, z + 4); blob.scale.set(40 * (1 - .4 * h), 22 * (1 - .4 * h), 1);
  ring.visible = !!air && !air.small;
  if (ring.visible) { ring.position.copy(hero.position); drawRing(1 - air.t / air.T); }

  // частицы
  for (let i = 0; i < NP; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt; const a = i * 3;
    if (pLife[i] <= 0) { pPos[a + 1] = -9999; continue; }
    pVel[a + 1] -= 260 * dt; pPos[a] += pVel[a] * dt; pPos[a + 1] += pVel[a + 1] * dt; pPos[a + 2] += pVel[a + 2] * dt;
  }
  pGeo.attributes.position.needsUpdate = true;

  // камера
  const k = Math.min(1, dt * 5);
  camX += (px * .62 + cx(dist + 250) * .38 - camX) * k;
  lookX += (px * .45 + cx(dist + 520) * .55 - lookX) * k;
  fov += ((boostT > 0 ? 80 : 68) - fov) * Math.min(1, dt * 4);
  if (Math.abs(camera.fov - fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const sh = shake > 0 ? shake * 26 : 0;
  const kk = kSlope;
  world.matrix.set(1, 0, 0, 0, 0, 1, kk, -kk * z, 0, 0, 1, 0, 0, 0, 0, 1); world.matrixWorldNeedsUpdate = true;   // y' = y + k·(z − zИгрока)
  camera.position.set(camX + rand(-sh, sh), CAM_H + CAM_HK * kk + kk * 470 + rand(-sh, sh), z + 470);
  camera.lookAt(lookX, 40 - kk * 420 * CAM_F, z - 420);
  camera.rotation.z += -lean * .045;

  const tilt = -Math.atan(kk) * SKY_T;                 // даль наклоняется слабее склона — горизонт поднимается, склон «уходит вниз»
  sky.position.copy(camera.position); sky.rotation.x = tilt;
  mountains.position.set(camera.position.x, kk * 470 * SKY_T, camera.position.z); mountains.rotation.x = tilt;
  sun.position.set(px - 1100, 1000, z - 2100); sun.target.position.set(px, 0, z - 300);

  // снегопад
  for (let i = 0; i < NF; i++) {
    const a = i * 3;
    fPos[a] = camX + fBase[a] + Math.sin(time * .7 + i) * 24;
    fPos[a + 1] = ((fBase[a + 1] - time * 85) % 800 + 800) % 800;
    fPos[a + 2] = camera.position.z + 150 - 2400 + (fBase[a + 2] + dist) % 2400;
  }
  fGeo.attributes.position.needsUpdate = true;
}

/* ---------- Цикл ---------- */
let last = 0;
function frame(t) {
  const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
  update(dt);
  if (state !== 'menu' && state !== 'final') { sync(dt); renderer.render(scene, camera); }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { last = 0; });
requestAnimationFrame(frame);

/* ---------- Управление ---------- */
const keys = { l: false, r: false };
let lastX = null;
cv.addEventListener('pointerdown', e => { e.preventDefault(); lastX = e.clientX; trick(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => {
  const w = app.getBoundingClientRect().width;
  if (e.pointerType === 'mouse' && !e.buttons) { const c = cx(dist); target = c + ((e.clientX - app.getBoundingClientRect().left) / w - .5) * 2 * (S.hw + 40); lastX = null; return; }
  if (lastX !== null) target += (e.clientX - lastX) / w * 470;
  lastX = e.clientX;
});
const up = () => { lastX = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.r = true;
  if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); trick(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.r = false;
});
document.addEventListener('touchmove', e => { if (!e.target.closest('.overlay')) e.preventDefault(); }, { passive: false });

/* ---------- Меню ---------- */
const NODES = [[16, 88], [50, 91], [84, 80], [52, 62], [17, 46], [82, 37], [50, 20], [84, 9]];
function buildMenu() {
  const p = $('path');
  let d = `M -6,100 L ${NODES[0][0]},${NODES[0][1]}`;
  for (let i = 1; i < NODES.length; i++) {
    const [x0, y0] = NODES[i - 1], [x1, y1] = NODES[i];
    d += ` C ${x0 + (x1 - x0) * .9},${y0 + 2} ${x0 + (x1 - x0) * .1},${y1 + 2} ${x1},${y1}`;
  }
  d += ' L 106,4';
  p.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#2f6bff" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:26px"/></svg>`;
  STAGES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'node' + (i + 1 > maxStage ? ' locked' : '') + (i + 1 === maxStage ? ' current' : '');
    b.style.left = NODES[i][0] + '%'; b.style.top = NODES[i][1] + '%';
    b.innerHTML = `<img src="img/m${i + 1}.png" alt=""><span>${i + 1}. ${s.name}</span>`;
    if (i + 1 > maxStage) b.disabled = true;
    b.addEventListener('click', () => startStage(i + 1));
    p.appendChild(b);
  });
  $('btnPlay').textContent = maxStage > 1 ? `Продолжить: ${STAGES[maxStage - 1].name}` : 'Играть';
  $('row8').innerHTML = STAGES.map((s, i) => `<img src="img/m${i + 1}.png" alt="${s.name}">`).join('');
}
function toMenu() { state = 'menu'; $('hint').classList.remove('on'); $('off').classList.remove('on'); buildMenu(); show('menu'); }
$('btnPlay').addEventListener('click', () => startStage(maxStage));
$('btnNext').addEventListener('click', () => startStage(stage + 1));
$('btnRetry').addEventListener('click', () => startStage(stage));
$('btnOverMenu').addEventListener('click', toMenu);
$('btnFinalMenu').addEventListener('click', toMenu);
$('btnHome').addEventListener('click', toMenu);
$('btnSound').addEventListener('click', () => { soundOn = !soundOn; $('btnSound').style.opacity = soundOn ? 1 : .4; });
buildMenu();

// для проверки из консоли
window.__game = { start: startStage, get objs() { return objs; }, get s() { return { state, stage, points, hearts, dist, px, air: !!air, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }, steer: x => { target = x; }, tune: o => { if ('H' in o) CAM_H = o.H; if ('HK' in o) CAM_HK = o.HK; if ('F' in o) CAM_F = o.F; if ('T' in o) SKY_T = o.T; }, trick, win: () => add(999) };
})();
