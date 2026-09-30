/* Flowline AI — immersive 3D world.
   A real-time Three.js scene behind the site: the Flowline mark rebuilt as a
   true 3D liquid-gold loop, drifting gold-dust particle fields, and a camera
   that flies through the world as you scroll. The DOM content scrolls above it.
   Fails safe: if WebGL, the CDN, or motion preferences block it, the page
   falls back to the flat 2D logo with zero breakage. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  'use strict';

  var canvas = document.getElementById('world');
  var fallbackImg = document.getElementById('logoFallback');
  function showFallback() { if (fallbackImg) fallbackImg.hidden = false; }

  /* Respect users who prefer no motion: skip the 3D world entirely. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { showFallback(); return; }
  if (!canvas || !window.WebGLRenderingContext) { showFallback(); return; }

  var isMobile = Math.min(window.innerWidth, window.innerHeight) < 640;

  /* ---------------- renderer / scene / camera ---------------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { showFallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.03);

  var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.6, 8.2);

  /* Studio reflections for the gold — generated locally, no HDR download. */
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var key = new THREE.DirectionalLight(0xffe2b0, 1.4);
  key.position.set(5, 7, 6);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x6a7bd6, 0.55);
  rim.position.set(-6, -2, -4);
  scene.add(rim);
  var glowLight = new THREE.PointLight(0xe0a93e, 24, 20, 1.8);
  glowLight.position.set(0, 1, 2.5);
  scene.add(glowLight);
  scene.add(new THREE.AmbientLight(0x2a2a35, 0.7));

  /* ---------------- the logo as a true 3D object ----------------
     A flowing closed loop (the Flowline mark's silhouette) swept into a tube
     and cast in liquid gold: full metal, clearcoat, studio reflections. */
  function loopCurve() {
    var pts = [], SEG = 180;
    for (var i = 0; i < SEG; i++) {
      var t = (i / SEG) * Math.PI * 2;
      var r = 2.0 * (1 + 0.14 * Math.sin(3 * t + 1.1) + 0.05 * Math.sin(7 * t + 0.4));
      pts.push(new THREE.Vector3(
        Math.cos(t) * r,
        0.5 * Math.sin(2 * t + 0.7) + 0.14 * Math.sin(5 * t + 2.0),
        Math.sin(t) * r * 0.92
      ));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6);
  }
  var loopMesh = new THREE.Mesh(
    new THREE.TubeGeometry(loopCurve(), 320, 0.34, 32, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8a24a,
      metalness: 1.0,
      roughness: 0.27,
      clearcoat: 1.0,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.35
    })
  );
  scene.add(loopMesh);

  /* Soft golden aura that hangs behind the loop. */
  function radialTexture(inner, outer) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  var aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture('rgba(224,169,62,0.55)', 'rgba(224,169,62,0)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8
  }));
  aura.scale.set(11, 11, 1);
  scene.add(aura);

  /* ---------------- particle fields ---------------- */
  var dustTex = radialTexture('rgba(255,225,160,1)', 'rgba(255,225,160,0)');

  function makeDust(count) {
    var pos = new Float32Array(count * 3);
    var seed = new Float32Array(count * 2);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 13;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * 8;
      pos[i * 3 + 2] = -12 + Math.random() * 16;
      seed[i * 2] = Math.random() * Math.PI * 2;
      seed[i * 2 + 1] = 0.15 + Math.random() * 0.5;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.09, map: dustTex, transparent: true, opacity: 0.7,
      color: 0xf5c86a, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    var points = new THREE.Points(geo, mat);
    points.userData = { seed: seed, count: count };
    return points;
  }
  var dust = makeDust(isMobile ? 500 : 1300);
  scene.add(dust);

  /* Distant starfield for depth. */
  var starGeo = new THREE.BufferGeometry();
  (function () {
    var n = isMobile ? 250 : 650, p = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var v = new THREE.Vector3().randomDirection().multiplyScalar(20 + Math.random() * 16);
      p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z - 6;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  })();
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.06, color: 0x9aa0c0, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(stars);

  /* ---------------- scroll-driven camera flight ----------------
     Each chapter of the page owns a camera waypoint. Scrolling eases the
     camera between them — a flight through the world. */
  var CHAPTERS = [
    { id: 'top',      cam: [0, 0.6, 8.2],   look: [0, 0.9, 0],   loop: [0, 1.0, 0] },
    { id: 'demo',     cam: [3.4, 0.7, 7.0],  look: [0, 0.2, 0],   loop: [-1.8, 0.5, -0.6] },
    { id: 'services', cam: [-3.2, 1.1, 7.2], look: [0, 0.2, 0],  loop: [1.8, 0.3, -0.8] },
    { id: 'how',      cam: [0.4, -0.8, 7.8], look: [0, 0.1, 0],   loop: [0, 1.3, -1.2] },
    { id: 'pricing',  cam: [2.6, 1.5, 8.4],  look: [0, 0.3, 0],   loop: [0, 0.4, -0.6] },
    { id: 'faq',      cam: [-2.4, 0.3, 7.6], look: [0, 0.2, 0],   loop: [1.7, 0.7, -1.0] },
    { id: 'contact',  cam: [0, 0.9, 9.8],    look: [0, 0.5, 0],   loop: [0, 0.6, -2.0] },
    { id: '__foot',   cam: [0, 0.5, 11.5],   look: [0, 0.4, 0],   loop: [0, 0.4, -3.0] }
  ];
  var waypoints = [];
  function computeWaypoints() {
    var vh = window.innerHeight;
    waypoints = CHAPTERS.map(function (ch) {
      var el = ch.id === '__foot'
        ? document.querySelector('footer')
        : document.getElementById(ch.id);
      var top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
      var zBoost = isMobile ? 1.3 : 1.0;
      return {
        at: Math.max(0, top - vh * 0.45),
        cam: new THREE.Vector3(ch.cam[0], ch.cam[1], ch.cam[2] * zBoost),
        look: new THREE.Vector3(ch.look[0], ch.look[1], ch.look[2]),
        loop: new THREE.Vector3(ch.loop[0], ch.loop[1], ch.loop[2])
      };
    });
  }
  computeWaypoints();

  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  var lastY = window.scrollY, scrollVel = 0;
  function smooth(t) { return t * t * (3 - 2 * t); }

  var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), loopTarget = new THREE.Vector3();
  var tmpLook = new THREE.Vector3();
  var clock = new THREE.Clock();
  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { clock.getDelta(); tick(); }
  });

  var firstFrame = true;

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    var y = window.scrollY;

    /* Scroll velocity → warp feel: dust rushes past, FOV breathes. */
    scrollVel += ((y - lastY) - scrollVel) * 0.12;
    lastY = y;
    var rush = Math.max(-1, Math.min(1, scrollVel * 0.02));

    /* Find the flight segment. */
    var i = 0;
    while (i < waypoints.length - 2 && y > waypoints[i + 1].at) i++;
    var a = waypoints[i], b = waypoints[i + 1];
    var seg = Math.max(1, b.at - a.at);
    var k = smooth(Math.max(0, Math.min(1, (y - a.at) / seg)));

    camPos.lerpVectors(a.cam, b.cam, k);
    tmpLook.lerpVectors(a.look, b.look, k);

    /* Mouse parallax + cinematic breathing, eased. */
    mouse.sx += (mouse.x - mouse.sx) * 0.04;
    mouse.sy += (mouse.y - mouse.sy) * 0.04;
    camera.position.set(
      camPos.x + mouse.sx * 0.55 + Math.sin(t * 0.4) * 0.08,
      camPos.y - mouse.sy * 0.35 + Math.sin(t * 0.53) * 0.06,
      camPos.z
    );
    camera.lookAt(tmpLook);
    var targetFov = 42 + Math.abs(rush) * 26;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * 0.1;
      camera.updateProjectionMatrix();
    }

    /* The loop drifts between chapters, spins slowly, floats. */
    loopTarget.lerpVectors(a.loop, b.loop, k);
    loopMesh.position.set(
      loopTarget.x,
      loopTarget.y + Math.sin(t * 0.7) * 0.14,
      loopTarget.z
    );
    loopMesh.rotation.y += dt * 0.28;
    loopMesh.rotation.x = Math.sin(t * 0.3) * 0.14;
    aura.position.copy(loopMesh.position);

    /* Gold dust: slow rise + swirl, plus scroll-rush streaming past. */
    var dp = dust.geometry.attributes.position;
    var sd = dust.userData.seed, n = dust.userData.count;
    var arr = dp.array;
    for (var p = 0; p < n; p++) {
      var s1 = sd[p * 2], s2 = sd[p * 2 + 1];
      var ix = p * 3;
      arr[ix] += Math.sin(t * 0.4 + s1) * 0.0016;
      arr[ix + 1] += s2 * dt * 0.35;
      arr[ix + 2] += rush * 0.35 + Math.cos(t * 0.3 + s1) * 0.0012;
      if (arr[ix + 1] > 8) arr[ix + 1] = -8;
      if (arr[ix + 2] > 5) arr[ix + 2] = -12; else if (arr[ix + 2] < -12.5) arr[ix + 2] = 4.5;
    }
    dp.needsUpdate = true;
    stars.rotation.y = t * 0.004;

    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; window.__worldReady = true; }
  }

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      computeWaypoints();
    }, 150);
  });

  tick();
})();
