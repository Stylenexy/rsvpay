import * as THREE from 'three';

const AMBER = new THREE.Color(1.0, 0.56, 0.18);

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

/** Shared geometry: the hero and orbit use exactly the same envelope. */
export function createGlassEnvelope() {
  // ---- the glass envelope
  const glass = new THREE.Group();

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

  return { glass, flap, orb, halo, bloom, bloomMat, lamp, dot };
}
