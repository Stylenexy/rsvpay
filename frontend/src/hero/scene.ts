import * as THREE from 'three';
import { clamp, ease, lerp, seg, track, win } from './math';

const AMBER = new THREE.Color(1.0, 0.56, 0.18);
const ICE = new THREE.Color(0.55, 0.85, 1.0);

/** [p, x, y, depth, rotX, rotY, rotZ]; x and y are fractions of the half screen. */
const PATH = [
  [0.0, 0.5, 1.5, -2, 0.7, -1.3, 0.5],
  [0.07, 0.42, 0.2, 0, -0.1, -0.5, 0.16],
  [0.14, 0.4, 0.1, 0.2, -0.16, -0.42, 0.1],
  [0.24, 0.38, 0.06, 0.8, -0.1, -0.2, 0.02],
  [0.38, 0.38, 0.06, 0.8, -0.08, -0.12, 0.02],
  [0.46, 0.42, 0.1, 0, -0.14, -0.4, 0.08],
  [0.62, 0.52, 0.2, -9, -0.25, Math.PI * 2 - 0.5, -0.1],
  [0.72, 0.5, 0.0, 0.2, -0.08, Math.PI * 2 + 0.34, 0.06],
  [0.84, 0.5, -0.04, 0.8, -0.03, Math.PI * 2 + 0.14, 0.0],
  [0.93, 0.46, 0.0, 0.8, -0.05, Math.PI * 2 - 0.1, 0.0],
  [1.0, -1.5, 1.2, -5, 0.5, Math.PI * 2 - 1.1, 0.6],
];

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function softDot() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = 255 * a * a * a;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A small softbox studio: glass only looks like glass when it has something bright to reflect. */
function studio(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0.012, 0.03, 0.07);
  const panel = (w: number, h: number, pos: number[], color: THREE.Color, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(14, 2.4, [0, 9, 3], new THREE.Color(1, 1, 1), 16);
  panel(2.2, 14, [-10, 0, 4], ICE, 12);
  panel(2.2, 12, [10, 1, 2], new THREE.Color(0.75, 0.82, 1), 7);
  panel(12, 2, [0, -9, 4], AMBER, 5);
  panel(4, 4, [0, 0, 12], new THREE.Color(1, 1, 1), 1.4);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.03);
  pm.dispose();
  return rt.texture;
}

export type SkyFrame = { a: ImageBitmap | null; b: ImageBitmap | null; ai: number; bi: number; mix: number };

export function createScene(canvas: HTMLCanvasElement, lowPower: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.transmissionResolutionScale = lowPower ? 0.5 : 0.75;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);

  const camera = new THREE.PerspectiveCamera(26, 2, 0.1, 80);
  camera.position.set(0, 0, 13);

  // ---- sky: two neighbouring video frames blended, so the picture moves between frames too
  const texA = new THREE.Texture();
  const texB = new THREE.Texture();
  for (const t of [texA, texB]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.generateMipmaps = false;
    t.minFilter = t.magFilter = THREE.LinearFilter;
  }
  const skyU = {
    uA: { value: texA },
    uB: { value: texB },
    uMix: { value: 0 },
    uAspect: { value: 2 },
    uShift: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uLift: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
      fragmentShader: `
        uniform sampler2D uA,uB;uniform float uMix,uAspect,uTime,uLift;uniform vec2 uShift;varying vec2 vUv;
        float n(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
          vec2 uv=vUv-.5;
          float ra=uAspect/(16./9.);
          if(ra>1.)uv.y/=ra;else uv.x*=ra;
          uv=uv*.95+.5+uShift;
          vec3 c=mix(texture2D(uA,uv).rgb,texture2D(uB,uv).rgb,uMix);
          c*=1.+uLift;
          vec2 q=vUv-.5;
          c*=1.-dot(q,q)*.55;
          c+=(n(vUv*vec2(1600.,900.)+uTime)-.5)*.012;
          gl_FragColor=vec4(max(c,0.),1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  // ---- the glass envelope
  const glass = new THREE.Group();
  scene.add(glass);

  const clear = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    roughness: 0.04,
    ior: 1.52,
    thickness: 1.1,
    attenuationColor: new THREE.Color(0.6, 0.86, 1),
    attenuationDistance: 1.8,
    specularIntensity: 1,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  const frost = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    roughness: 0.62,
    ior: 1.5,
    thickness: 0.7,
    color: new THREE.Color(0.93, 0.97, 1),
    attenuationColor: new THREE.Color(0.72, 0.88, 1),
    attenuationDistance: 1.6,
    specularIntensity: 0.8,
    envMapIntensity: 1.25,
  });
  const flapGlass = frost.clone();
  flapGlass.roughness = 0.34;
  flapGlass.envMapIntensity = 1.7;

  const W = 3.5;
  const H = 2.3;
  const outer = rounded(W, H, 0.3);
  const hole = rounded(W - 0.34, H - 0.34, 0.16);
  outer.holes.push(new THREE.Path(hole.getPoints(14).reverse()));
  const rimGeo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.2,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.08,
    bevelSegments: 8,
    curveSegments: 20,
  });
  rimGeo.translate(0, 0, -0.1);
  glass.add(new THREE.Mesh(rimGeo, clear));

  const faceGeo = new THREE.ExtrudeGeometry(rounded(W - 0.3, H - 0.3, 0.14), {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 2,
    curveSegments: 12,
  });
  faceGeo.translate(0, 0, -0.02);
  glass.add(new THREE.Mesh(faceGeo, frost));

  // two lower folds, from the bottom corners to the middle
  const fold = (x: number) =>
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.LineCurve3(new THREE.Vector3(x * 1.56, -0.96, 0.07), new THREE.Vector3(x * 0.34, 0.02, 0.07)),
        2,
        0.03,
        10,
      ),
      clear,
    );
  glass.add(fold(1), fold(-1));

  // flap: hinged on the top edge
  const fw = 1.58;
  const fh = 1.16;
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-fw, 0);
  flapShape.lineTo(fw, 0);
  flapShape.lineTo(0.2, -fh + 0.12);
  flapShape.quadraticCurveTo(0, -fh, -0.2, -fh + 0.12);
  flapShape.lineTo(-fw, 0);
  const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSize: 0.024,
    bevelThickness: 0.024,
    bevelSegments: 4,
    curveSegments: 12,
  });
  const flap = new THREE.Group();
  flap.position.set(0, 0.98, 0.08);
  flap.add(new THREE.Mesh(flapGeo, flapGlass));
  glass.add(flap);

  // what is kept inside: an opaque orb behind the frosted face, so the glass really blurs it
  const dot = softDot();
  const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.64, 0.28).multiplyScalar(1.9), toneMapped: false });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), orbMat);
  orb.position.set(0, 0.02, -0.14);
  glass.add(orb);
  const haloMat = new THREE.SpriteMaterial({
    map: dot,
    color: AMBER.clone().multiplyScalar(1.15),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.copy(orb.position);
  glass.add(halo);
  const bloomMat = new THREE.SpriteMaterial({
    map: dot,
    color: AMBER.clone(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0.4,
    toneMapped: false,
  });
  const bloom = new THREE.Sprite(bloomMat);
  bloom.position.set(0, 0.02, 0.4);
  glass.add(bloom);
  const lamp = new THREE.PointLight(AMBER, 6, 7, 1.6);
  lamp.position.set(0, 0.02, 0.3);
  glass.add(lamp);

  // a soft shadow on the cloud deck, so the envelope sits in the scene instead of on top of it
  const shadeMat = new THREE.SpriteMaterial({
    map: dot,
    color: new THREE.Color(0.02, 0.05, 0.14),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const shade = new THREE.Sprite(shadeMat);
  scene.add(shade);

  // ring: sound made visible, concentric waves that leave the envelope
  const waveU = { uR: { value: 0 }, uTint: { value: AMBER.clone() } };
  const wave = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: waveU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        uniform float uR;uniform vec3 uTint;varying vec2 vUv;
        void main(){
          float d=length(vUv-.5)*2.;
          float a=0.;
          for(int i=0;i<4;i++){
            float t=fract(uR*2.6+float(i)*.25);
            float r=t*.96;
            a+=smoothstep(.016,0.,abs(d-r))*(1.-t)*(1.-t);
          }
          a*=smoothstep(1.,.8,d);
          gl_FragColor=vec4(uTint*a*min(1.,uR*7.),a);
        }`,
    }),
  );
  scene.add(wave);

  // the Rp95.000 travelling to Siti (and back when she replies); position is a function of p
  const COUNT = lowPower ? 90 : 200;
  const pos = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  const seed = Array.from({ length: COUNT }, (_, i) => [((i * 7) % COUNT) / COUNT, Math.sin(i * 12.3), Math.cos(i * 7.1)]);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: dot }, uH: { value: 800 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: `attribute float aSize;uniform float uH;
        void main(){vec4 m=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*m;gl_PointSize=aSize*uH*.09/-m.z;}`,
      fragmentShader: `uniform sampler2D uMap;
        void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(vec3(1.,.72,.38)*t.a*1.4,t.a);}`,
    }),
  );
  points.frustumCulled = false;
  scene.add(points);

  const box = { hw: 6, hh: 3 };
  const tmp = new THREE.Vector3();
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    skyU.uAspect.value = w / h;
    (points.material as THREE.ShaderMaterial).uniforms.uH.value = h * renderer.getPixelRatio();
    box.hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    box.hw = box.hh * camera.aspect;
  }

  let holdA = -1;
  let holdB = -1;
  function setSky(f: SkyFrame) {
    if (f.ai !== holdA && f.ai === holdB) {
      // the frame we need is already on the other texture: swap instead of uploading
      const u = skyU.uA.value;
      skyU.uA.value = skyU.uB.value;
      skyU.uB.value = u;
      const h = holdA;
      holdA = holdB;
      holdB = h;
    }
    if (f.a && f.ai !== holdA) {
      skyU.uA.value.image = f.a;
      skyU.uA.value.needsUpdate = true;
      holdA = f.ai;
    }
    if (f.b && f.bi !== holdB) {
      skyU.uB.value.image = f.b;
      skyU.uB.value.needsUpdate = true;
      holdB = f.bi;
    }
    skyU.uMix.value = f.mix;
  }

  /** Draws one frame and returns where the envelope is on screen, 0..1, for the DOM light. */
  function draw(p: number, time: number, mx: number, my: number, frame: SkyFrame, narrow: boolean) {
    setSky(frame);
    skyU.uTime.value = time % 10;
    skyU.uShift.value.set(mx * 0.008, my * 0.006 + (p - 0.5) * 0.012);
    skyU.uLift.value = seg(p, 0.88, 1) * 0.1;

    const [fx, fy, depth, rx, ry, rz] = track(PATH, p);
    // envelope stays slightly alive even when the timeline is parked
    const idle = 1 - win(p, 0.72, 0.76, 0.82, 0.84) * 0.6;
    const bob = Math.sin(time * 0.9) * 0.05 * idle;
    const ringT = seg(p, 0.74, 0.84);
    const hop = Math.abs(Math.sin(ringT * Math.PI * 5)) * (1 - ringT * 0.55) * (ringT > 0 && ringT < 1 ? 0.34 : 0);

    const xShift = narrow ? 0 : fx;
    glass.position.set(xShift * box.hw, (narrow ? fy * 0.9 + 0.22 : fy) * box.hh + bob + hop, depth);
    glass.rotation.set(rx + my * 0.05, ry + mx * 0.09, rz + Math.sin(ringT * Math.PI * 14) * 0.05 * (1 - ringT));
    const s = narrow ? 0.62 : 1;
    glass.scale.setScalar(s);

    // flap opens to release the gift, closes over what is kept; opens again for the reply
    const open = ease(seg(p, 0.2, 0.26)) * (1 - ease(seg(p, 0.37, 0.43))) + ease(seg(p, 0.86, 0.89)) * (1 - ease(seg(p, 0.92, 0.95)));
    flap.rotation.x = -open * 2.5;

    // size of the light: gift, then only the kept 5%, then filled again by the reply
    const given = ease(seg(p, 0.02, 0.1));
    const out = ease(seg(p, 0.26, 0.37));
    const back = ease(seg(p, 0.87, 0.92));
    const pulse = 1 + Math.sin(ringT * Math.PI * 10) * 0.25 * win(p, 0.74, 0.76, 0.83, 0.86);
    const r = lerp(lerp(0.04, 0.2, given), 0.075, out);
    const glow = lerp(r, 0.2, back) * pulse;
    orb.scale.setScalar(glow);
    halo.scale.setScalar(glow * 7);
    bloom.scale.setScalar(glow * 9);
    const night = seg(p, 0.46, 0.72);
    bloomMat.opacity = lerp(0.16, 0.5, night);
    lamp.intensity = lerp(2, 7, glow / 0.2);

    const lift = clamp(1 - Math.abs(depth) / 10) * (fy > 0.9 ? 0 : 1) * (p > 0.96 ? 0 : 1);
    shade.position.set(glass.position.x * 0.96, -0.56 * box.hh - hop * 0.2, depth - 2);
    shade.scale.set(7.6 * s, 1.5 * s * (1 - hop), 1);
    shadeMat.opacity = 0.34 * lift * (1 - hop * 1.4);

    // waves
    const waveOn = seg(p, 0.74, 0.86);
    wave.visible = waveOn > 0 && p < 0.9;
    waveU.uR.value = waveOn;
    wave.position.copy(glass.position);
    wave.position.z = depth - 0.2;
    wave.scale.setScalar(9.5);

    // particles: orb to the top right (Siti), then back
    const sendT = seg(p, 0.25, 0.4);
    const backT = seg(p, 0.86, 0.93);
    const going = sendT > 0 && sendT < 1;
    const coming = backT > 0 && backT < 1;
    points.visible = going || coming;
    if (points.visible) {
      const u = going ? sendT : 1 - backT;
      glass.getWorldPosition(A);
      A.y += 0.05;
      B.set(0.86 * box.hw, -0.5 * box.hh, 0.6);
      C.copy(A).lerp(B, 0.5);
      C.y += 1.6;
      for (let i = 0; i < COUNT; i++) {
        const [ph, a, b] = seed[i];
        const k = clamp((u * 1.75 - ph * 0.75) / 1);
        const e = ease(k);
        const spread = Math.sin(k * Math.PI) * 0.34;
        tmp.set(
          (1 - e) * (1 - e) * A.x + 2 * (1 - e) * e * C.x + e * e * B.x + a * spread,
          (1 - e) * (1 - e) * A.y + 2 * (1 - e) * e * C.y + e * e * B.y + b * spread,
          lerp(A.z, B.z, e),
        );
        pos[i * 3] = tmp.x;
        pos[i * 3 + 1] = tmp.y;
        pos[i * 3 + 2] = tmp.z;
        size[i] = k > 0 && k < 1 ? (0.5 + 0.5 * Math.abs(a)) * 2.4 : 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aSize.needsUpdate = true;
    }

    renderer.render(scene, camera);

    tmp.copy(glass.position).project(camera);
    return { x: (tmp.x + 1) / 2, y: (1 - tmp.y) / 2 };
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
    texA.dispose();
    texB.dispose();
    dot.dispose();
  }

  function quality(pixelRatio: number, transmission: number) {
    renderer.setPixelRatio(pixelRatio);
    renderer.transmissionResolutionScale = transmission;
  }

  /** Real GPU cost of a frame: render, then wait for the GPU with a one-pixel read. */
  function gpuCost(run: () => void) {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const t0 = performance.now();
    for (let i = 0; i < 12; i++) {
      run();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    return (performance.now() - t0) / 12;
  }

  return { draw, resize, dispose, quality, gpuCost, renderer };
}
