/* FloGlo AI — immersive 3D world.
   A real-time Three.js scene behind the site: the FloGlo mark rebuilt as a
   true 3D liquid-platinum loop, drifting cyan-dust particle fields, and a camera
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
  scene.fog = new THREE.FogExp2(0x050914, 0.03);

  var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.6, 8.2);

  /* Studio reflections for the platinum — generated locally, no HDR download. */
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var key = new THREE.DirectionalLight(0xd8f4ff, 1.4);
  key.position.set(5, 7, 6);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x3ee2ff, 0.75);
  rim.position.set(-6, -2, -4);
  scene.add(rim);
  var glowLight = new THREE.PointLight(0x3ee2ff, 24, 20, 1.8);
  glowLight.position.set(0, 1, 2.5);
  scene.add(glowLight);
  scene.add(new THREE.AmbientLight(0x1a2438, 0.7));

  /* ---------------- the logo as a true 3D object ----------------
     The actual FloGlo mark: the logo's liquid ring was traced into a 3D
     centerline (256 samples, each carrying the band's true thickness),
     swept into a varying-radius tube, and cast in liquid platinum with a
     faint watery iridescence. Traveling pulse waves and a slow liquid surge
     flow around the ring every frame — it never sits still. */
  /* Traced from public/logo.png — 256 [x, y, z, thickness] samples. */
  var LOGO_RING = [[1.6989,-0.0,0.1435,0.3322],[1.7061,-0.0419,0.1501,0.3289],[1.7151,-0.0843,0.1564,0.3265],[1.7251,-0.1273,0.1624,0.3251],[1.7353,-0.1709,0.1679,0.3246],[1.7446,-0.2152,0.173,0.3248],[1.7523,-0.2599,0.1777,0.3258],[1.7574,-0.3049,0.182,0.3274],[1.7592,-0.3499,0.1859,0.3294],[1.7572,-0.3946,0.1893,0.3318],[1.751,-0.4386,0.1922,0.3343],[1.7402,-0.4816,0.1947,0.3369],[1.7248,-0.5232,0.1967,0.3395],[1.7047,-0.5632,0.1982,0.3419],[1.6803,-0.6012,0.1993,0.344],[1.6518,-0.6372,0.1999,0.3459],[1.6196,-0.6708,0.2,0.3475],[1.5842,-0.7022,0.1996,0.3488],[1.5462,-0.7313,0.1987,0.3499],[1.5062,-0.7582,0.1974,0.3508],[1.4648,-0.783,0.1956,0.3516],[1.4226,-0.8059,0.1933,0.3525],[1.38,-0.8272,0.1905,0.3536],[1.3377,-0.8471,0.1873,0.355],[1.2961,-0.866,0.1836,0.357],[1.2555,-0.8842,0.1795,0.3596],[1.2163,-0.9021,0.175,0.363],[1.1788,-0.92,0.17,0.3674],[1.1431,-0.9381,0.1647,0.3728],[1.1094,-0.957,0.1589,0.3794],[1.0778,-0.9768,0.1527,0.3871],[1.0482,-0.998,0.1462,0.396],[1.0207,-1.0207,0.1393,0.4061],[0.9952,-1.0453,0.1321,0.4172],[0.9716,-1.072,0.1246,0.4292],[0.9497,-1.101,0.1168,0.442],[0.9294,-1.1324,0.1087,0.4553],[0.9103,-1.1664,0.1003,0.4689],[0.8922,-1.203,0.0917,0.4824],[0.8748,-1.2422,0.0829,0.4957],[0.8578,-1.2838,0.0738,0.5083],[0.8407,-1.3277,0.0646,0.5198],[0.8233,-1.3735,0.0553,0.5301],[0.805,-1.4209,0.0458,0.5386],[0.7854,-1.4695,0.0361,0.5452],[0.7644,-1.5185,0.0265,0.5496],[0.7414,-1.5676,0.0167,0.5514],[0.7162,-1.6158,0.0069,0.5506],[0.6887,-1.6627,-0.0029,0.5469],[0.6586,-1.7073,-0.0127,0.5403],[0.6258,-1.7491,-0.0225,0.5308],[0.5905,-1.7874,-0.0322,0.5183],[0.5526,-1.8215,-0.0419,0.503],[0.5123,-1.8512,-0.0514,0.485],[0.4699,-1.8759,-0.0608,0.4646],[0.4256,-1.8955,-0.0701,0.442],[0.3799,-1.9099,-0.0792,0.4175],[0.333,-1.9193,-0.0881,0.3915],[0.2854,-1.9238,-0.0968,0.3644],[0.2373,-1.924,-0.1053,0.3366],[0.1891,-1.9202,-0.1135,0.3085],[0.1411,-1.9132,-0.1215,0.2805],[0.0935,-1.9037,-0.1291,0.2531],[0.0465,-1.8923,-0.1365,0.2267],[0.0,-1.8798,-0.1435,0.2016],[-0.0458,-1.867,-0.1501,0.1782],[-0.0911,-1.8544,-0.1564,0.1568],[-0.1359,-1.8425,-0.1624,0.1379],[-0.1804,-1.8319,-0.1679,0.1379],[-0.2248,-1.8228,-0.173,0.1379],[-0.2693,-1.8153,-0.1777,0.1379],[-0.314,-1.8095,-0.182,0.1379],[-0.3591,-1.8051,-0.1859,0.1379],[-0.4046,-1.802,-0.1893,0.1379],[-0.4508,-1.7997,-0.1922,0.1379],[-0.4975,-1.7979,-0.1947,0.1379],[-0.5448,-1.796,-0.1967,0.1379],[-0.5925,-1.7936,-0.1982,0.1379],[-0.6405,-1.7902,-0.1993,0.1379],[-0.6887,-1.7854,-0.1999,0.1379],[-0.7368,-1.7788,-0.2,0.1379],[-0.7847,-1.7702,-0.1996,0.1384],[-0.8322,-1.7594,-0.1987,0.1535],[-0.8791,-1.7464,-0.1974,0.1694],[-0.9253,-1.7311,-0.1956,0.1862],[-0.9707,-1.7136,-0.1933,0.2036],[-1.0154,-1.6941,-0.1905,0.2214],[-1.0594,-1.6729,-0.1873,0.2394],[-1.1026,-1.6502,-0.1836,0.2576],[-1.1452,-1.6261,-0.1795,0.2759],[-1.1873,-1.6009,-0.175,0.2941],[-1.229,-1.5748,-0.17,0.3121],[-1.2703,-1.5479,-0.1647,0.3298],[-1.3112,-1.5201,-0.1589,0.3473],[-1.3517,-1.4914,-0.1527,0.3643],[-1.3917,-1.4618,-0.1462,0.3808],[-1.431,-1.431,-0.1393,0.3967],[-1.4692,-1.3988,-0.1321,0.412],[-1.5061,-1.365,-0.1246,0.4264],[-1.5411,-1.3294,-0.1168,0.44],[-1.574,-1.2917,-0.1087,0.4525],[-1.604,-1.2518,-0.1003,0.4639],[-1.6309,-1.2096,-0.0917,0.474],[-1.6542,-1.165,-0.0829,0.4826],[-1.6736,-1.1183,-0.0738,0.4896],[-1.6889,-1.0695,-0.0646,0.4949],[-1.7,-1.019,-0.0553,0.4983],[-1.7071,-0.9671,-0.0458,0.4997],[-1.7104,-0.9142,-0.0361,0.4989],[-1.7104,-0.8609,-0.0265,0.496],[-1.7077,-0.8077,-0.0167,0.4908],[-1.7032,-0.755,-0.0069,0.4832],[-1.6978,-0.7032,0.0029,0.4734],[-1.6924,-0.6528,0.0127,0.4613],[-1.6883,-0.6041,0.0225,0.4471],[-1.6863,-0.5571,0.0322,0.4308],[-1.6875,-0.5119,0.0419,0.4126],[-1.6927,-0.4684,0.0514,0.3927],[-1.7027,-0.4265,0.0608,0.3715],[-1.7179,-0.3858,0.0701,0.349],[-1.7384,-0.3458,0.0792,0.3257],[-1.7644,-0.3061,0.0881,0.3019],[-1.7953,-0.2663,0.0968,0.278],[-1.8306,-0.2258,0.1053,0.2542],[-1.8694,-0.1841,0.1135,0.2311],[-1.9107,-0.1409,0.1215,0.2088],[-1.9531,-0.0959,0.1291,0.1879],[-1.9952,-0.049,0.1365,0.1685],[-2.0357,-0.0,0.1435,0.1511],[-2.073,0.0509,0.1501,0.1379],[-2.1058,0.1035,0.1564,0.1379],[-2.1329,0.1573,0.1624,0.1379],[-2.1532,0.2121,0.1679,0.1379],[-2.166,0.2671,0.173,0.1379],[-2.1707,0.322,0.1777,0.1379],[-2.1671,0.376,0.182,0.1379],[-2.1552,0.4287,0.1859,0.1379],[-2.1355,0.4796,0.1893,0.1379],[-2.1086,0.5282,0.1922,0.1379],[-2.0753,0.5743,0.1947,0.1379],[-2.0366,0.6178,0.1967,0.14],[-1.9938,0.6586,0.1982,0.1541],[-1.9479,0.697,0.1993,0.1696],[-1.9003,0.733,0.1999,0.186],[-1.8521,0.7672,0.2,0.2031],[-1.8044,0.7998,0.1996,0.2204],[-1.7581,0.8315,0.1987,0.2378],[-1.714,0.8628,0.1974,0.2548],[-1.6726,0.894,0.1956,0.2712],[-1.6342,0.9258,0.1933,0.2866],[-1.599,0.9584,0.1905,0.3008],[-1.5669,0.9922,0.1873,0.3136],[-1.5378,1.0275,0.1836,0.3249],[-1.5111,1.0643,0.1795,0.3344],[-1.4867,1.1026,0.175,0.342],[-1.4638,1.1423,0.17,0.3477],[-1.442,1.1834,0.1647,0.3515],[-1.4207,1.2255,0.1589,0.3533],[-1.3996,1.2685,0.1527,0.3532],[-1.3781,1.3121,0.1462,0.3513],[-1.356,1.356,0.1393,0.3477],[-1.3332,1.4003,0.1321,0.3424],[-1.3093,1.4446,0.1246,0.3357],[-1.2844,1.489,0.1168,0.3278],[-1.2586,1.5336,0.1087,0.3187],[-1.2318,1.5784,0.1003,0.3087],[-1.2042,1.6236,0.0917,0.2981],[-1.1758,1.6695,0.0829,0.287],[-1.1467,1.7162,0.0738,0.2756],[-1.1171,1.764,0.0646,0.2641],[-1.0867,1.8131,0.0553,0.2528],[-1.0556,1.8634,0.0458,0.2418],[-1.0237,1.9151,0.0361,0.2314],[-0.9906,1.9681,0.0265,0.2216],[-0.9563,2.0219,0.0167,0.2127],[-0.9204,2.0763,0.0069,0.2049],[-0.8826,2.1308,-0.0029,0.1981],[-0.8427,2.1846,-0.0127,0.1925],[-0.8004,2.237,-0.0225,0.1883],[-0.7556,2.2873,-0.0322,0.1855],[-0.7082,2.3345,-0.0419,0.184],[-0.6581,2.3779,-0.0514,0.184],[-0.6053,2.4167,-0.0608,0.1854],[-0.5502,2.4502,-0.0701,0.1882],[-0.4929,2.4779,-0.0792,0.1924],[-0.4337,2.4994,-0.0881,0.1979],[-0.373,2.5145,-0.0968,0.2045],[-0.3112,2.5233,-0.1053,0.2122],[-0.2488,2.526,-0.1135,0.2208],[-0.1861,2.523,-0.1215,0.2302],[-0.1235,2.5149,-0.1291,0.2402],[-0.0614,2.5025,-0.1365,0.2506],[-0.0,2.4866,-0.1435,0.2613],[0.0606,2.4682,-0.1501,0.272],[0.1203,2.4481,-0.1564,0.2826],[0.179,2.4272,-0.1624,0.2929],[0.237,2.4065,-0.1679,0.3026],[0.2943,2.3864,-0.173,0.3117],[0.3512,2.3677,-0.1777,0.3199],[0.4079,2.3505,-0.182,0.3271],[0.4645,2.3352,-0.1859,0.3333],[0.5213,2.3216,-0.1893,0.3383],[0.5785,2.3096,-0.1922,0.342],[0.6361,2.2987,-0.1947,0.3445],[0.6942,2.2886,-0.1967,0.3458],[0.7527,2.2785,-0.1982,0.3458],[0.8114,2.2678,-0.1993,0.3447],[0.8702,2.2559,-0.1999,0.3425],[0.9287,2.2421,-0.2,0.3395],[0.9866,2.2258,-0.1996,0.3357],[1.0437,2.2067,-0.1987,0.3313],[1.0995,2.1843,-0.1974,0.3266],[1.1537,2.1584,-0.1956,0.3216],[1.206,2.129,-0.1933,0.3167],[1.2564,2.0961,-0.1905,0.3121],[1.3046,2.0601,-0.1873,0.3079],[1.3505,2.0212,-0.1836,0.3044],[1.3944,1.9799,-0.1795,0.3017],[1.4362,1.9365,-0.175,0.3],[1.4763,1.8916,-0.17,0.2993],[1.5147,1.8457,-0.1647,0.2999],[1.5519,1.7991,-0.1589,0.3017],[1.5882,1.7523,-0.1527,0.3048],[1.6236,1.7053,-0.1462,0.3091],[1.6585,1.6585,-0.1393,0.3146],[1.6929,1.6118,-0.1321,0.3212],[1.7268,1.5651,-0.1246,0.3288],[1.7602,1.5183,-0.1168,0.3371],[1.7927,1.4713,-0.1087,0.3461],[1.8241,1.4236,-0.1003,0.3555],[1.8539,1.375,-0.0917,0.365],[1.8817,1.3252,-0.0829,0.3744],[1.9067,1.274,-0.0738,0.3836],[1.9285,1.2212,-0.0646,0.3923],[1.9464,1.1666,-0.0553,0.4002],[1.9601,1.1104,-0.0458,0.4072],[1.969,1.0524,-0.0361,0.4131],[1.9729,0.9931,-0.0265,0.4177],[1.9716,0.9325,-0.0167,0.4211],[1.9652,0.8711,-0.0069,0.423],[1.954,0.8094,0.0029,0.4235],[1.9384,0.7477,0.0127,0.4225],[1.9189,0.6866,0.0225,0.4202],[1.8962,0.6264,0.0322,0.4166],[1.8714,0.5677,0.0419,0.4119],[1.8452,0.5106,0.0514,0.4062],[1.8187,0.4556,0.0608,0.3996],[1.7929,0.4026,0.0701,0.3924],[1.7687,0.3518,0.0792,0.3848],[1.747,0.3031,0.0881,0.3769],[1.7284,0.2564,0.0968,0.3691],[1.7135,0.2113,0.1053,0.3615],[1.7026,0.1677,0.1135,0.3542],[1.6959,0.1251,0.1215,0.3476],[1.6933,0.0832,0.1291,0.3416],[1.6945,0.0416,0.1365,0.3364]];

  var RING_SEGS = 300, RADIAL_SEGS = 28;
  var ringCurve = new THREE.CatmullRomCurve3(LOGO_RING.map(function (p) {
    return new THREE.Vector3(p[0], p[1], p[2]);
  }), true, 'catmullrom', 0.5);
  var ringThick = LOGO_RING.map(function (p) { return p[3]; });
  function thickAt(u) {
    var f = u * LOGO_RING.length, fl = Math.floor(f);
    var i0 = ((fl % LOGO_RING.length) + LOGO_RING.length) % LOGO_RING.length;
    var i1 = (i0 + 1) % LOGO_RING.length, k = f - fl;
    return ringThick[i0] * (1 - k) + ringThick[i1] * k;
  }

  /* Swept tube with per-station radius = the logo's own band thickness.
     Per-vertex animation data is stored so each frame can pulse the radius
     (liquid flowing around the ring) without rebuilding anything. */
  var ringFrames = ringCurve.computeFrenetFrames(RING_SEGS, true);
  var tubeGeo = new THREE.BufferGeometry();
  var ringVerts = RADIAL_SEGS + 1;
  var vTotal = (RING_SEGS + 1) * ringVerts;
  var posArr = new Float32Array(vTotal * 3);
  var nrmArr = new Float32Array(vTotal * 3);
  var uvArr = new Float32Array(vTotal * 2);
  var vCenter = new Float32Array(vTotal * 3);
  var vDir = new Float32Array(vTotal * 3);
  var vBaseR = new Float32Array(vTotal);
  var vTheta = new Float32Array(vTotal);
  var idxArr = [];
  var tmpC = new THREE.Vector3();
  for (var ri = 0; ri <= RING_SEGS; ri++) {
    var u = ri / RING_SEGS;
    ringCurve.getPointAt(u === 1 ? 0 : u, tmpC);
    var N = ringFrames.normals[ri], B = ringFrames.binormals[ri];
    var baseR = thickAt(u);
    var theta = u * Math.PI * 2;
    for (var rj = 0; rj <= RADIAL_SEGS; rj++) {
      var va = (rj / RADIAL_SEGS) * Math.PI * 2;
      var co = Math.cos(va), si = Math.sin(va);
      var vi = ri * ringVerts + rj;
      var dx = N.x * co + B.x * si,
          dy = N.y * co + B.y * si,
          dz = N.z * co + B.z * si;
      var o = vi * 3;
      vCenter[o] = tmpC.x; vCenter[o + 1] = tmpC.y; vCenter[o + 2] = tmpC.z;
      vDir[o] = dx; vDir[o + 1] = dy; vDir[o + 2] = dz;
      vBaseR[vi] = baseR; vTheta[vi] = theta;
      posArr[o] = tmpC.x + dx * baseR;
      posArr[o + 1] = tmpC.y + dy * baseR;
      posArr[o + 2] = tmpC.z + dz * baseR;
      nrmArr[o] = dx; nrmArr[o + 1] = dy; nrmArr[o + 2] = dz;
      uvArr[vi * 2] = u; uvArr[vi * 2 + 1] = rj / RADIAL_SEGS;
    }
  }
  for (var qi = 0; qi < RING_SEGS; qi++) {
    for (var qj = 0; qj < RADIAL_SEGS; qj++) {
      var a0 = qi * ringVerts + qj, b0 = (qi + 1) * ringVerts + qj;
      idxArr.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
    }
  }
  tubeGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  tubeGeo.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
  tubeGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  tubeGeo.setIndex(idxArr);

  /* Liquid flow: traveling pulse waves around the ring plus one slow,
     visible surge that laps the loop every ~7 seconds. Normals stay valid
     because each ring pulses nearly uniformly (radial direction approx). */
  function flowTube(t) {
    var surge = (t * 0.85) % (Math.PI * 2);
    var pos = tubeGeo.attributes.position.array;
    for (var vi = 0; vi < vTotal; vi++) {
      var th = vTheta[vi];
      var dth = th - surge;
      dth = Math.atan2(Math.sin(dth), Math.cos(dth));
      var pulse = 1
        + 0.05 * Math.sin(3 * th - t * 2.6)
        + 0.035 * Math.sin(6 * th + t * 1.7)
        + 0.11 * Math.exp(-(dth * dth) / 0.28);
      var r = vBaseR[vi] * pulse;
      var o = vi * 3;
      pos[o] = vCenter[o] + vDir[o] * r;
      pos[o + 1] = vCenter[o + 1] + vDir[o + 1] * r;
      pos[o + 2] = vCenter[o + 2] + vDir[o + 2] * r;
    }
    tubeGeo.attributes.position.needsUpdate = true;
  }

  var loopMesh = new THREE.Mesh(
    tubeGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xd6ecff,
      metalness: 1.0,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      iridescence: 0.3,
      iridescenceIOR: 1.32,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide
    })
  );
  scene.add(loopMesh);

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
  /* ---------------- particle fields ---------------- */
  var dustTex = radialTexture('rgba(160,235,255,1)', 'rgba(160,235,255,0)');

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
      color: 0x9beaff, depthWrite: false, blending: THREE.AdditiveBlending,
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
    size: 0.06, color: 0x8fb4e8, transparent: true, opacity: 0.55,
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
    flowTube(t);

    /* Cyan dust: slow rise + swirl, plus scroll-rush streaming past. */
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
