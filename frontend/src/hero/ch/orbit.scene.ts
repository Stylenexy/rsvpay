import * as THREE from 'three';
import { createGlassEnvelope } from '../glass';
import { clamp, ease, seg } from '../math';
import { asset } from './shared';
import { orbitCardFrame, orbitFrame, particleCount } from './layout';

const TAU = Math.PI * 2;

/** Sky, glass, light and cards share one camera and one transmission buffer. */
export function mountOrbit(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.orbit-canvas')!;
  const stage = root.querySelector<HTMLElement>('.orbit-world')!;
  const labels = [...root.querySelectorAll<HTMLElement>('[data-orbit-card]')];
  const theme = getComputedStyle(root);
  const css = (name: string) => theme.getPropertyValue(name).trim();
  const color = (name: string) => new THREE.Color(css(name));
  const linear = (name: string) => new THREE.Color(...css(name).split(' ').map(Number) as [number, number, number]);
  const blue = color('--ch-blue'), amber = color('--ch-amber'), ice = color('--ch-ice');
  const phone = () => window.innerWidth <= 760;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: !lowPower, powerPreference: 'low-power' }); }
  catch { root.classList.add('orbit-fallback'); return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower || phone() ? 1.25 : 1.65));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.transmissionResolutionScale = lowPower ? .5 : .75;
  const scene = new THREE.Scene(); scene.background = color('--ch-deep');
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100); camera.position.set(0, 0, 14);
  // Same five softboxes, linear colours and intensities as the opening hero.
  const studio = new THREE.Scene(); studio.background = linear('--ch-studio-ground');
  const panels = [
    { s: [14, 2.4], p: [0, 9, 3], c: color('--ch-white'), k: 16 },
    { s: [2.2, 14], p: [-10, 0, 4], c: linear('--ch-studio-ice'), k: 12 },
    { s: [2.2, 12], p: [10, 1, 2], c: linear('--ch-studio-fill'), k: 7 },
    { s: [12, 2], p: [0, -9, 4], c: linear('--ch-studio-amber'), k: 5 },
    { s: [4, 4], p: [0, 0, 12], c: color('--ch-white'), k: 1.4 },
  ];
  panels.forEach(({ s, p, c, k }) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(s[0], s[1]), new THREE.MeshBasicMaterial({ color: c.multiplyScalar(k), side: THREE.DoubleSide }));
    panel.position.set(p[0], p[1], p[2]); panel.lookAt(0, 0, 0); studio.add(panel);
  });
  const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromScene(studio, .03);
  scene.environment = environment.texture; pmrem.dispose();
  studio.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material instanceof THREE.Material) mesh.material.dispose(); });
  let dead = false;
  const textures = new Set<THREE.Texture>();
  const skyTexture = new THREE.TextureLoader().load(asset('antariksa'), texture => { if (dead) texture.dispose(); });
  skyTexture.colorSpace = THREE.SRGBColorSpace; textures.add(skyTexture);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: skyTexture, toneMapped: false }));
  sky.position.z = -18; scene.add(sky);
  const subject = new THREE.Group(); scene.add(subject);
  const envelope = createGlassEnvelope(); subject.add(envelope.glass);
  // Only this instance changes; the opening hero keeps its original glass.
  const glassMaterials = new Set<THREE.MeshPhysicalMaterial>();
  envelope.glass.traverse(object => {
    const material = (object as THREE.Mesh).material;
    if (material instanceof THREE.MeshPhysicalMaterial) glassMaterials.add(material);
  });
  glassMaterials.forEach(material => {
    const frosted = material.roughness > .3;
    material.color.copy(color('--ch-glass-frost'));
    material.emissive.copy(color('--ch-glass-emission')); material.emissiveIntensity = frosted ? .22 : .06;
    material.transmission = frosted ? .9 : 1; material.thickness = frosted ? .32 : .45;
    material.roughness = frosted ? .4 : .16; material.envMapIntensity = frosted ? 1.1 : .65;
    material.specularIntensity = .5; material.clearcoat = .35;
  });
  // Opaque-pass sprite: transmission must sample this light before glass is drawn.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const glowContext = glowCanvas.getContext('2d')!;
  const glowGradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
  [[0, '--ch-white'], [.14, '--ch-amber'], [.42, '--ch-ice'], [.68, '--ch-disc-blue'], [1, '--ch-zero']].forEach(([stop, token]) => glowGradient.addColorStop(Number(stop), css(String(token))));
  glowContext.fillStyle = glowGradient; glowContext.fillRect(0, 0, 256, 256);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace; textures.add(glowTexture);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.position.set(0, 0, -.5); glow.scale.set(4.6, 3.1, 1); glow.material.color.setScalar(.42); envelope.glass.add(glow);
  envelope.glass.rotation.set(-.08, -.18, .02);
  envelope.orb.scale.setScalar(.17); envelope.halo.scale.setScalar(1.65); envelope.bloom.scale.setScalar(3);
  const disc = new THREE.Group(); subject.add(disc);
  const discMaterial = new THREE.ShaderMaterial({
    defines: { OCTAVES: phone() || lowPower ? 3 : 5 },
    uniforms: { uScroll: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 1 }, uInner: { value: 3.45 }, uAmber: { value: amber }, uBlue: { value: color('--ch-disc-blue') }, uWhite: { value: color('--ch-white') } },
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vDisc;void main(){vDisc=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uScroll,uTime,uAlpha,uInner;uniform vec3 uAmber,uBlue,uWhite;varying vec2 vDisc;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float sum=0.,weight=.5;for(int i=0;i<OCTAVES;i++){sum+=weight*noise(p);p=p*2.03+17.1;weight*=.5;}return sum;}
      void main(){
        float r=length(vDisc);if(r<uInner)discard;
        float radial=clamp((r-uInner)/(12.-uInner),0.,1.);
        float phase=atan(vDisc.y,vDisc.x)-uScroll*7.5*pow(uInner/r,1.5)-uTime*.018;
        // Periodic angular domain, stretched radially, has no seam at atan's cut.
        vec2 orbital=vec2(cos(phase),sin(phase));
        float warp=fbm(orbital*1.8+vec2(r*.65,uScroll));
        vec2 domain=orbital*2.2+vec2(r*8.+warp*3.4,r*1.7);
        float grain=fbm(domain);
        float streak=smoothstep(.34,.72,grain);
        float inner=exp(-radial*22.);
        float edge=smoothstep(0.,.012,radial)*(1.-smoothstep(.12,.82,radial));
        float doppler=.32+1.25*pow(.5-.5*vDisc.x/r,2.);
        vec3 tint=mix(uAmber,uBlue,smoothstep(.015,.3,radial));
        tint=mix(uWhite,tint,smoothstep(0.,.05,radial));
        float light=(.05+streak*.3+inner*.95)*edge*doppler;
        gl_FragColor=vec4(tint*light,uAlpha);
      }`,
  });
  const discSurface = new THREE.Mesh(new THREE.RingGeometry(3.45, 12, phone() ? 160 : 256, 1), discMaterial);
  disc.add(discSurface);
  const count = 32000, geometry = new THREE.BufferGeometry(), seeds = new Float32Array(count * 3);
  const random = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < count; i++) { seeds[i * 3] = random(i + 1); seeds[i * 3 + 1] = random(i + count); seeds[i * 3 + 2] = random(i + count * 2); }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: { uScroll: { value: 0 }, uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() }, uAlpha: { value: 1 }, uFlatten: { value: 0 }, uAmber: { value: amber }, uBlue: { value: blue }, uWhite: { value: color('--ch-white') } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `attribute vec3 aSeed;uniform float uScroll,uTime,uPixel,uFlatten;uniform vec3 uAmber,uWhite,uBlue;varying vec3 vTint;varying float vAlpha;
      void main(){
        float r=3.6+pow(aSeed.y,1.25)*8.4;
        float speed=pow(3.25/r,1.5);
        float angle=aSeed.x*6.2831853-uScroll*8.7*speed-uTime*.035*speed;
        float streak=pow(.5+.5*sin(angle*7.+r*5.5),3.);
        vec3 p=vec3(cos(angle)*r,sin(angle)*r,(aSeed.z-.5)*(.05+aSeed.y*.24)*(1.-uFlatten));
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((3.5+pow(aSeed.z,5.)*9.)*uPixel*14./-view.z,2.5,16.);
        float edge=smoothstep(0.,.1,aSeed.y)*(1.-smoothstep(.65,1.,aSeed.y));
        float doppler=.4+1.5*pow(.5-.5*cos(angle),3.);
        vAlpha=(.06+streak*.35)*edge*doppler;
        vTint=mix(uAmber,uWhite,smoothstep(0.,.35,aSeed.y));vTint=mix(vTint,uBlue,smoothstep(.3,.95,aSeed.y));
      }`,
    fragmentShader: `uniform float uAlpha;varying vec3 vTint;varying float vAlpha;
      void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*5.)*(1.-smoothstep(.65,1.,d))*vAlpha*uAlpha;gl_FragColor=vec4(vTint*2.,a);}`,
  });
  const points = new THREE.Points(geometry, particleMaterial); points.frustumCulled = false; disc.add(points);
  const orbitLines = [3.5, 4.1].map(radius => {
    const line = new THREE.Mesh(new THREE.TorusGeometry(radius, .004, 4, 512), new THREE.MeshBasicMaterial({ color: ice, transparent: true, opacity: .24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    disc.add(line); return line;
  });
  const cometMaterial = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: 0 }, uAlpha: { value: 1 }, uBlue: { value: blue }, uAmber: { value: amber } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uPhase,uAlpha;uniform vec3 uBlue,uAmber;varying vec2 vUv;
      void main(){float d=fract(vUv.x-uPhase);float tail=pow(1.-d,7.);float head=pow(1.-d,240.);gl_FragColor=vec4(mix(uBlue,uAmber,tail)*(1.+head*5.),(.08+tail*.8+head)*uAlpha);}`,
  });
  disc.add(new THREE.Mesh(new THREE.TorusGeometry(5.5, .025, 6, 768), cometMaterial));
  const cometHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: envelope.dot, color: ice.clone().multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  cometHead.scale.setScalar(.5); disc.add(cometHead);
  // Crisp text textures let the cards pass behind and refract through the envelope.
  const painters: (() => void)[] = [];
  const cards = labels.map(label => {
    const surface = document.createElement('canvas'); surface.width = 960; surface.height = 680;
    const ctx = surface.getContext('2d')!;
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture);
    const paint = () => {
      const font = getComputedStyle(label);
      ctx.clearRect(0, 0, 960, 680);
      ctx.fillStyle = css('--ch-card-plate'); ctx.beginPath(); ctx.roundRect(0, 0, 960, 680, 36); ctx.fill();
      const highlight = ctx.createLinearGradient(0, 0, 0, 260); highlight.addColorStop(0, css('--ch-card-highlight')); highlight.addColorStop(1, css('--ch-zero'));
      ctx.fillStyle = highlight; ctx.fill();
      ctx.strokeStyle = css('--ch-card-rim'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(3, 3, 954, 674, 36); ctx.stroke();
      ctx.fillStyle = css('--ch-amber'); ctx.fillRect(64, 64, 96, 3);
      ctx.fillStyle = css('--ch-ice'); ctx.font = `500 52px ${font.fontFamily}`; ctx.fillText(label.querySelector('.ch-label')!.textContent!, 64, 136);
      ctx.fillStyle = css('--ch-fg'); ctx.font = `500 120px ${css('--f-hz')}`; ctx.fillText(label.querySelector('em')!.textContent!, 64, 290);
      ctx.fillStyle = css('--ch-amber'); ctx.font = `400 64px ${font.fontFamily}`; ctx.fillText(label.querySelector('b')!.textContent!, 64, 388);
      ctx.fillStyle = css('--ch-fg'); ctx.font = `500 64px ${font.fontFamily}`;
      const text = label.querySelector('p')!.textContent!;
      const words = /\s/u.test(text) ? text.split(/(\s+)/u) : Array.from(text); let line = ''; let y = 490;
      words.forEach(word => { if (ctx.measureText(line + word).width > 832) { ctx.fillText(line, 64, y); line = word.trimStart(); y += 72; } else line += word; });
      ctx.fillText(line, 64, y); texture.needsUpdate = true;
    };
    paint(); painters.push(paint);
    const card = new THREE.Group();
    const ink = new THREE.Mesh(new THREE.PlaneGeometry(1, 680 / 960), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    card.add(ink); subject.add(card); return card;
  });
  void document.fonts.ready.then(() => { if (!dead) painters.forEach(paint => paint()); });
  let width = 1, height = 1, worldHeight = 1;
  const resize = () => {
    width = stage.clientWidth; height = stage.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower || phone() ? 1.25 : 1.65)); renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const backdropHeight = worldHeight * 32 / 14;
    sky.scale.set(Math.max(backdropHeight * 16 / 9, backdropHeight * camera.aspect) * 1.9, Math.max(backdropHeight, backdropHeight * camera.aspect * 9 / 16) * 1.9, 1);
    geometry.setDrawRange(0, particleCount(phone(), lowPower));
    particleMaterial.uniforms.uPixel.value = renderer.getPixelRatio();
    const octaves = phone() || lowPower ? 3 : 5;
    if (discMaterial.defines.OCTAVES !== octaves) { discMaterial.defines.OCTAVES = octaves; discMaterial.needsUpdate = true; }
  };
  const resizer = new ResizeObserver(resize); resizer.observe(stage); resize();
  let visible = false, raf = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), projected = new THREE.Vector3();
  const yearRoll = root.querySelector<HTMLElement>('.orbit-year-roll')!;
  const draw = (now: number) => {
    raf = 0;
    if (dead || !visible || document.hidden || reduced.matches) return;
    const p = clamp(parseFloat(root.style.getPropertyValue('--orbit-progress')) || 0);
    const frame = orbitFrame(width, height, p);
    const { tilt, centerY } = frame;
    const fade = ease(seg(p, .96, 1)), time = now / 1000;
    // Off-axis projection moves the composition without breaking the edge-on plane.
    camera.setViewOffset(width, height, (.5 - frame.centerX) * width, (.5 - centerY) * height, width, height);
    camera.updateMatrixWorld();
    disc.rotation.set(frame.angle, 0, 0);
    const subjectScale = frame.scale; disc.scale.setScalar(subjectScale);
    envelope.glass.scale.setScalar(worldHeight * (phone() ? .26 : .36) / 2.46 * (1 - ease(seg(p, .8, .92))));
    envelope.glass.rotation.y = -.18 + Math.sin(p * Math.PI) * .28; envelope.glass.visible = p < .93;
    discMaterial.uniforms.uInner.value = Math.max(3.45, envelope.glass.scale.x * 2.2 / subjectScale + .12);
    discMaterial.uniforms.uScroll.value = p; discMaterial.uniforms.uTime.value = time; discMaterial.uniforms.uAlpha.value = 1 - fade;
    particleMaterial.uniforms.uScroll.value = p; particleMaterial.uniforms.uTime.value = time; particleMaterial.uniforms.uAlpha.value = 1 - fade; particleMaterial.uniforms.uFlatten.value = tilt;
    cometMaterial.uniforms.uPhase.value = -p * 1.4 - time * .006; cometMaterial.uniforms.uAlpha.value = 1 - fade;
    const phase = cometMaterial.uniforms.uPhase.value * TAU;
    cometHead.position.set(Math.cos(phase) * 5.5, Math.sin(phase) * 5.5, 0); (cometHead.material as THREE.SpriteMaterial).opacity = 1 - fade;
    orbitLines.forEach(line => { (line.material as THREE.MeshBasicMaterial).opacity = .24 * (1 - fade); });
    let front = 0, depth = -Infinity;
    const titleTop = root.querySelector<HTMLElement>('.orbit-heading')!.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    cards.forEach((card, i) => {
      const a = -p * TAU + i * TAU / 3 + Math.PI / 2;
      // Independent card ring: the disc keeps its full inclination and vertical span.
      card.position.set(0, 0, Math.sin(a) * 4 * subjectScale);
      if (card.position.z > depth) { depth = card.position.z; front = i; }
      card.rotation.set(0, 0, 0);
      const placement = orbitCardFrame(width, height, titleTop, a);
      const perspective = (camera.position.z - card.position.z) / camera.position.z;
      const depthScale = .7 + .3 * ((Math.sin(a) + 1) / 2);
      const cardWidth = placement.width * worldHeight / height * perspective * depthScale;
      card.scale.setScalar(cardWidth);
      projected.set(placement.x / width * 2 - 1, 1 - placement.y / height * 2, 0).unproject(camera);
      projected.sub(camera.position).multiplyScalar((camera.position.z - card.position.z) / (camera.position.z - projected.z)).add(camera.position);
      card.position.x = projected.x; card.position.y = projected.y;
      card.visible = p < .8;
    });
    yearRoll.style.transform = `translateY(${-front * 100 / 3}%)`;
    const flare = Math.pow(clamp(depth / (4 * subjectScale)), 14);
    envelope.orb.scale.setScalar(.17 + flare * .035); envelope.bloomMat.opacity = .4 + flare * .25; envelope.lamp.intensity = 6 + flare * 4;
    renderer.render(scene, camera); canvas.style.opacity = String(1 - fade); root.classList.add('orbit-ready'); raf = requestAnimationFrame(draw);
  };
  const sync = () => {
    if (visible && !document.hidden && !dead && !reduced.matches) { if (!raf) raf = requestAnimationFrame(draw); }
    else { cancelAnimationFrame(raf); raf = 0; }
    if (reduced.matches) root.classList.remove('orbit-ready');
  };
  const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); }); observer.observe(root.querySelector('.orbit-stage')!);
  document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
  const lost = (event: Event) => { event.preventDefault(); visible = false; sync(); root.classList.remove('orbit-ready'); root.classList.add('orbit-fallback'); }; canvas.addEventListener('webglcontextlost', lost);
  return () => {
    dead = true; cancelAnimationFrame(raf); observer.disconnect(); resizer.disconnect();
    document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); canvas.removeEventListener('webglcontextlost', lost); root.classList.remove('orbit-ready');
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (Array.isArray(mesh.material)) mesh.material.forEach(material => materials.add(material)); else if (mesh.material) materials.add(mesh.material); });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
    envelope.dot.dispose(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
}
﻿
