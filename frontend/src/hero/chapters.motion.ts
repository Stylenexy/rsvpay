import { gsap, ScrollTrigger, SplitText } from './ch/animation';
import { CH_DATA } from './chapters.copy';
import { clamp, ease, seg } from './math';
import { cultureFrame, orbitCardFrame, proofFrame } from './ch/layout';

type Setter = (value: number | string) => void;
const TAU = Math.PI * 2;

/** ScrollTrigger reads the hero's scroll; it never pins, snaps or writes it. */
export function mountChapters(root: HTMLElement) {
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const $$ = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  const splits: SplitText[] = [];
  const removers: (() => void)[] = [];
  let disposed = false;
  const media = gsap.matchMedia();

  const context = gsap.context(() => {
    const index = $('.ch-index');
    const indexNames = $$('.ch-index-names > span');
    const page = root.closest<HTMLElement>('.hz-page')!;
    ScrollTrigger.create({ trigger: '.ch-close', start: 'top bottom', end: 'bottom top', toggleClass: { targets: page, className: 'ch-close-on' } });
    ScrollTrigger.create({ trigger: '.ch-footer', start: 'top 88px', end: 'bottom top', toggleClass: { targets: page, className: 'ch-footer-on' } });
    ScrollTrigger.create({ trigger: '.ch-round', start: 'top 60%', endTrigger: '.ch-names', end: 'bottom bottom', toggleClass: { targets: page, className: 'ch-stage-on' } });
    let active = -1;
    const selectIndex = (n: number, progress: number) => {
      $('.ch-index-track i').style.transform = `scaleY(${progress})`;
      if (n === active) return;
      active = n;
      gsap.to('.ch-digit-roll', { y: -n * 24, duration: .8, ease: 'expo.inOut', overwrite: true });
      gsap.to(indexNames, { y: -8, opacity: 0, duration: .35, ease: 'power3.out', overwrite: true });
      gsap.fromTo(indexNames[n - 2], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out', overwrite: true });
    };

    media.add({ reduced: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 761px)', phone: '(max-width: 760px)' }, (mm) => {
      const { reduced, desktop } = mm.conditions!;
      active = -1;
      const originals = [root, ...$$('*')].map(element => ({ element, style: element.getAttribute('style'), expanded: element.getAttribute('aria-expanded') }));
      const titles = $$('h2, .culture-word');
      const safeTitles = () => titles.forEach(title => {
        const top = title.getBoundingClientRect().top;
        title.style.opacity = String(reduced ? Number(top >= 96) : clamp((top - 96) / 16));
      });
      ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: safeTitles, onRefresh: safeTitles });
      if (reduced) return () => originals.forEach(({ element, style }) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); });
      const originalNumbers = $$('[data-counter], [data-split], .proof-attack-window code').map(element => ({ element, text: element.textContent }));

      // SplitText owns its masks, including reflow when a language font arrives.
      const instrumentLines: Element[][] = [];
      for (const element of $$('[data-lines]:not(.culture-custom)')) {
        if (element.closest('.proof-description')) {
          const split = SplitText.create(element, { type: 'lines', mask: 'lines' });
          splits.push(split); instrumentLines.push(split.lines); continue;
        }
        if (element.closest('.culture-finale')) continue;
        const split = SplitText.create(element, {
          type: 'lines,words', mask: 'lines', autoSplit: true, wordsClass: 'ch-word', linesClass: 'ch-split-line',
          onSplit: self => {
            return gsap.from(self.lines, { yPercent: 112, stagger: .075, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none reverse' } });
          },
        });
        splits.push(split);
      }
      const cultureChars = $$('[data-characters]').map(el => {
        const split = SplitText.create(el, { type: 'chars', mask: 'chars', charsClass: 'culture-char' });
        splits.push(split);
        return split.chars;
      });

      gsap.set(index, { autoAlpha: 0 });
      ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onEnter: () => gsap.to(index, { autoAlpha: 1, duration: .4 }), onLeaveBack: () => gsap.to(index, { autoAlpha: 0, duration: .3 }) });
      ScrollTrigger.create({ trigger: '.ch-footer', start: 'top 50%', onEnter: () => gsap.to(index, { autoAlpha: 0, duration: .3 }), onLeaveBack: () => gsap.to(index, { autoAlpha: 1, duration: .3 }) });
      $$('.ch-chapter').forEach(section => {
        ScrollTrigger.create({ trigger: section, start: 'top 45%', end: 'bottom 45%', onToggle: self => { if (self.isActive) selectIndex(Number(section.dataset.chapter), self.progress); }, onUpdate: self => { if (self.isActive) selectIndex(Number(section.dataset.chapter), self.progress); } });
      });

      const wedding = $('.ch-table');
      const panels = $$('.cp');
      const splitNumbers = $$('[data-split]');
      const locale = root.closest<HTMLElement>('[data-lang]')?.dataset.lang || 'en';
      let weddingProgress = 0;
      const control = { selected: 0, mix: 0 };
      const drawPanels = () => {
        const auto = seg(weddingProgress, .2, .85) * 3;
        const position = auto * (1 - control.mix) + control.selected * control.mix;
        const exit = ease(seg(weddingProgress, .85, .96));
        const rise = ease(seg(weddingProgress, .09, .2));
        const row = $('.cp-row');
        const column = (row.clientWidth - 11 * 24) / 12;
        // The copy measure comes from the open panel, never the moving shutter.
        row.style.setProperty('--panel-copy-width', `${desktop ? Math.min(560, column + 8 * (column + 24) - 64) : row.clientWidth - 32}px`);
        row.style.top = `${(desktop ? 47 : 44) * (1 - rise) + 96 / $('.wedding-stage').clientHeight * 100 * rise * (1 - exit)}%`;
        row.style.left = row.style.right = `calc(var(--hz-gutter) * ${1 - exit})`;
        row.style.bottom = `${64 * (1 - exit)}px`;
        $('.wedding-heading').style.clipPath = `inset(0 0 ${ease(seg(weddingProgress, .02, .09)) * 100}% 0)`;
        const entry = ease(seg(wedding.getBoundingClientRect().top, window.innerHeight * .2, 0));
        $('.wedding-heading').style.opacity = String(entry * (1 - seg(weddingProgress, .02, .08)));
        $('.cp-row').style.setProperty('--panel-gap', `${(desktop ? 24 : 4) * (1 - exit)}px`);
        panels.forEach((panel, i) => {
          const opening = ease(clamp(1 - Math.abs(position - i)));
          if (desktop) {
            const width = column + opening * 8 * (column + 24);
            panel.style.flex = `0 0 ${width * (1 - exit) + (i === 3 ? row.clientWidth * exit : 0)}px`;
          }
          panel.querySelector<HTMLElement>('.cp-no')!.style.opacity = String(1 - exit);
          panel.style.setProperty('--weight', String(i === 3 ? 1 + opening * (desktop ? 5 : 7) + exit * 8 : (1 + opening * (desktop ? 5 : 7)) * (1 - exit)));
          panel.style.setProperty('--panel-min', `${40 * (1 - exit)}px`);
          panel.style.opacity = String(i === 3 ? 1 : 1 - exit);
          panel.style.setProperty('--open', String(opening));
          panel.setAttribute('aria-expanded', String(opening > .5));
          const description = panel.querySelector<HTMLElement>('.cp-description')!;
          description.style.transform = `translateY(${(1 - ease(seg(opening, .2, 1))) * 48}px)`;
          const picture = panel.querySelector<HTMLElement>('.cp-picture img')!;
          picture.style.transform = `translateY(${(weddingProgress - .5) * (i % 2 ? -5 : 5)}%) scale(${1.15 - opening * .1})`;
          panel.querySelector<HTMLElement>('.cp-progress i')!.style.transform = `scaleX(${clamp(position - i + .5)})`;
          const tick = $$('.cp-ticks i')[i];
          tick.style.background = opening > .5 ? 'var(--ch-amber)' : 'var(--ch-line)';
          panel.querySelector<HTMLElement>('[data-panel-lines]')!.style.transform = `translateY(${(1 - opening) * 48}px)`;
        });
        const split = ease(clamp(1 - Math.abs(position - 2)));
        splitNumbers.forEach(el => { el.textContent = `Rp${Math.round(Number(el.dataset.split) * split / 100) * 100}`.replace(/\d+$/, n => Number(n).toLocaleString(locale)); });
      };
      gsap.set(panels, { '--weight': 1, '--open': 0 });
      gsap.set(panels.map(p => p.querySelector('[data-panel-lines]')), { y: 0 });
      gsap.set(panels.map(p => p.querySelector('.cp-picture img')), { y: 0, scale: 1.15 });
      const panelDriver = { p: 0 };
      gsap.to(panelDriver, { p: 1, ease: 'none', scrollTrigger: { trigger: wedding, start: 'top top', end: 'bottom bottom', scrub: .6 }, onUpdate: () => { weddingProgress = panelDriver.p; drawPanels(); } });
      let resume: gsap.core.Tween | undefined;
      panels.forEach((panel, i) => {
        const take = () => context.add(() => {
          resume?.kill();
          gsap.to(control, { selected: i, mix: 1, duration: .65, ease: 'power3.out', overwrite: true, onUpdate: drawPanels });
          resume = gsap.delayedCall(2.6, () => { gsap.to(control, { mix: 0, duration: 1.1, ease: 'power3.out', onUpdate: drawPanels }); });
        });
        for (const event of ['pointerenter', 'click', 'focus']) { panel.addEventListener(event, take); removers.push(() => panel.removeEventListener(event, take)); }
      });
      drawPanels();
      const measurePanels = () => drawPanels();
      window.addEventListener('resize', measurePanels);
      removers.push(() => window.removeEventListener('resize', measurePanels));
      ScrollTrigger.create({ trigger: wedding, start: 'top bottom', end: 'top top', onUpdate: drawPanels });
      gsap.from('.cp-picture', { clipPath: 'inset(100% 0 0)', stagger: .08, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: wedding, start: 'top 80%', toggleActions: 'play none none reverse' } });
      gsap.to('.wedding-atmosphere', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: wedding, start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.to('.ch-cloud-gate .ch-cloud:first-child', { yPercent: -65, ease: 'none', scrollTrigger: { trigger: wedding, start: 'top bottom', end: 'top top', scrub: .6 } });
      gsap.to('.ch-cloud-gate .ch-cloud-back', { yPercent: -55, ease: 'none', scrollTrigger: { trigger: wedding, start: 'top bottom', end: 'top top', scrub: .6 } });
      const weddingExit = gsap.timeline({ scrollTrigger: { trigger: wedding, start: '85% bottom', end: 'bottom bottom', scrub: .6 } });
      weddingExit.to('.ch-phone-light', { opacity: 1, duration: 1, ease: 'expo.inOut' }, 0).to('.cp-text, .cp-ticks', { opacity: 0, duration: .35 }, .15);
      gsap.timeline({ scrollTrigger: { trigger: '.orbit-entry-light', start: 'top bottom', end: 'bottom top', scrub: .6 } }).fromTo('.orbit-entry-light', { opacity: 0, scale: .5 }, { opacity: 1, scale: 1.2, duration: .45, ease: 'expo.inOut' }).to('.orbit-entry-light', { opacity: 0, scale: .15, duration: .55, ease: 'expo.inOut' });

      const orbit = $('.ch-round');
      gsap.to('.orbit-sky', { yPercent: -8, scale: 1.08, ease: 'none', scrollTrigger: { trigger: orbit, start: 'top bottom', end: 'bottom top', scrub: .6 } });

      const orbitState = { p: 0 };
      const cards = $$('.orbit-card');
      const cardSetters = cards.map(card => ({ x: gsap.quickSetter(card, 'x', 'px') as Setter, y: gsap.quickSetter(card, 'y', 'px') as Setter, scale: gsap.quickSetter(card, 'scale') as Setter, opacity: gsap.quickSetter(card, 'opacity') as Setter }));
      gsap.set(cards, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, opacity: 1 });
      const updateOrbit = () => {
        const p = orbitState.p;
        orbit.style.setProperty('--orbit-progress', String(p));
        // The WebGL module replaces these projected positions once it is ready.
        if (!orbit.classList.contains('orbit-ready')) cards.forEach((card, i) => {
          const a = -p * TAU + i * TAU / 3 + Math.PI / 2;
          const depth = (Math.sin(a) + 1) / 2;
          const height = $('.orbit-stage').clientHeight;
          const titleTop = $('.orbit-heading').getBoundingClientRect().top - $('.orbit-stage').getBoundingClientRect().top;
          const frame = orbitCardFrame(orbit.clientWidth, height, titleTop, a);
          card.style.width = `${frame.width}px`;
          const scale = .6 + .4 * depth;
          const halfHeight = card.offsetHeight * scale / 2;
          cardSetters[i].x(frame.x - orbit.clientWidth / 2);
          cardSetters[i].y(Math.max(104 + halfHeight, Math.min(frame.y, titleTop - 16 - halfHeight)) - height / 2);
          cardSetters[i].scale(scale);
          cardSetters[i].opacity(.35 + .65 * depth);
          card.style.zIndex = depth > .5 ? '5' : '1';
        });
        if (!orbit.classList.contains('orbit-ready')) {
          const year = clamp(Math.floor(p * 3), 0, 2);
          $('.orbit-year-roll').style.transform = `translateY(${-year * 100 / 3}%)`;
        }
      };
      gsap.to(orbitState, { p: 1, ease: 'none', scrollTrigger: { trigger: orbit, start: 'top top', end: 'bottom bottom', scrub: .6 }, onUpdate: updateOrbit });
      gsap.timeline({ scrollTrigger: { trigger: orbit, start: '90% bottom', end: '97% bottom', scrub: .4 } })
        .to('.orbit-heading, .orbit-year, .orbit-static, .orbit-cards', { opacity: 0, duration: .35, ease: 'power3.out' }, 0);
      // One fixed rule bridges the two sticky stages, without a one-frame jump.
      const ruleState = { orbit: 0, proof: 0 };
      const rule = $('.ch-handoff-rule');
      const drawRule = () => { rule.style.opacity = String(ease(seg(ruleState.orbit, .91, .96)) * (1 - seg(ruleState.proof, .1, .16))); };
      gsap.to(ruleState, { orbit: 1, ease: 'none', onUpdate: drawRule, scrollTrigger: { trigger: orbit, start: 'top top', end: 'bottom bottom', scrub: .6 } });
      updateOrbit();

      const proof = $('.ch-proof');
      const instruments = $$('.proof-instrument');
      const proofState = { p: 0 };
      const shards = $$('.key-shard');
      const strikes = $$('.proof-strikes > i');
      const ripples = $$('.proof-ripples > i');
      const counters = $$('[data-counter]');
      const attackNames = $$('.proof-attack-window code');
      gsap.set(instrumentLines.flat(), { yPercent: 0 });
      gsap.to(ruleState, { proof: 1, ease: 'none', onUpdate: drawRule, scrollTrigger: { trigger: proof, start: 'top top', end: 'bottom bottom', scrub: .6 } });
      gsap.to('.proof-heading h2', { scale: desktop ? .22 : .55, ease: 'power3.out', scrollTrigger: { trigger: proof, start: 'top top', end: '8% top', scrub: .6 } });
      gsap.from('.proof-steps', { autoAlpha: 0, scrollTrigger: { trigger: proof, start: '8% top', end: '10% top', scrub: .6 } });
      gsap.set(shards, { opacity: 0, x: 0, y: 0, rotate: 0 });
      shards.forEach((shard, i) => { shard.style.clipPath = `polygon(${i * 14}% 0,${(i + 1) * 15}% 0,${(i + 1) * 15 + 14}% 100%,${i * 14}% 100%)`; });
      const reels = counters.map((element, i) => {
        const slots = i === 0 ? 1 : 2;
        element.textContent = '';
        const digits = Array.from({ length: slots }, () => {
          const mask = document.createElement('span'); mask.className = 'proof-digit';
          const reel = document.createElement('span'); reel.className = 'proof-digit-reel';
          for (let n = 0; n < 10; n++) { const digit = document.createElement('span'); digit.textContent = String(n); reel.append(digit); }
          mask.append(reel); element.append(mask); return reel;
        });
        if (i === 1 || i === 3) element.append(document.createTextNode(i === 1 ? '/12' : '%'));
        return (value: number) => {
          String(value).padStart(slots, '0').split('').forEach((digit, n) => { digits[n].style.transform = `translateY(${-Number(digit) * 10}%)`; });
          element.setAttribute('aria-label', `${value}${i === 1 ? '/12' : i === 3 ? '%' : ''}`);
        };
      });
      const proofTimeline = gsap.timeline({ scrollTrigger: { trigger: proof, start: 'top top', end: 'bottom bottom', scrub: .6 } });
      proofTimeline.to(proofState, { p: 1, duration: 1, ease: 'none', onUpdate: () => {
        const p = proofState.p;
        const { weights, slot } = proofFrame(p);
        instruments.forEach((instrument, i) => {
          instrument.style.opacity = String(weights[i]);
          instrument.style.visibility = weights[i] > 0 ? 'visible' : 'hidden';
          instrument.style.pointerEvents = weights[i] > .5 ? 'auto' : 'none';
          instrument.style.transform = `translateY(${(i > slot ? 1 : -1) * (1 - weights[i]) * 24}px)`;
        });
        const local = counters.map((_, i) => seg(p, .04 + i * .17, .159 + i * .17));
        const landed = counters.map((_, i) => seg(p, .04 + (i - .3) * .17, .04 + (i + .12) * .17));
        reels[0](1 - Math.round(landed[0]));
        reels[1](Math.round(landed[1] * 12));
        reels[2](Math.round(landed[2] * 45));
        reels[3](Math.round(landed[3] * 10));
        const crack = ease(seg(local[0], .18, .72));
        $('.proof-key > img').style.opacity = String(1 - ease(seg(local[0], .15, .35)));
        shards.forEach((shard, i) => { shard.style.opacity = String(crack * (1 - .55 * seg(local[0], .75, 1))); shard.style.transform = `translate(${Math.sin(i * 8) * crack * 100}px,${Math.cos(i * 4) * crack * 96}px) rotate(${(i - 3) * crack * 12}deg)`; });
        strikes.forEach((strike, i) => {
          const t = clamp(local[1] * 13 - i);
          strike.style.opacity = String(Math.sin(t * Math.PI));
          strike.style.top = `${25 + (i * 17 % 55)}%`;
          strike.style.transform = `translateX(${(1 - t) * 240}px) scaleX(${1 - t * .7})`;
          const ring = ripples[i];
          ring.style.top = `${20 + (i * 17 % 55)}%`;
          ring.style.opacity = String(Math.sin(t * Math.PI) * .7);
          ring.style.transform = `scale(${.2 + t * 2.4})`;
        });
        const attackWindow = $('.proof-attack-window');
        const attackList = attackWindow.querySelector<HTMLElement>('ol')!;
        attackList.style.transform = `translateY(${-local[1] * Math.max(0, attackList.scrollHeight - attackWindow.clientHeight * .8)}px)`;
        attackNames.forEach((element, i) => {
          const name = CH_DATA.attacks[i];
          const text = name.slice(0, Math.round(clamp(local[1] * 10 - i) * name.length));
          if (element.textContent !== text) element.textContent = text;
        });
        const testWindow = $('.proof-test-window');
        const testList = testWindow.querySelector<HTMLElement>('ol')!;
        testList.style.transform = `translateY(${36 - local[2] * (36 + Math.max(0, testList.scrollHeight - testWindow.clientHeight * .72))}px)`;
        const attempt = seg(local[3], .3, .95);
        const bounce = Math.sin(attempt * Math.PI * 4) * (1 - attempt) * 13;
        $('.seal-handle').style.transform = `rotate(${36 + Math.max(0, bounce)}deg)`;
        $('.seal-arc').style.setProperty('--seal-amount', String(landed[3] * 10));
        $$('.proof-steps i').forEach((el, i) => { el.style.background = i <= slot ? 'var(--ch-blue)' : 'var(--ch-line)'; });
      } }, 0).to('.proof-amber-wipe', { clipPath: 'circle(150% at 75% 45%)', duration: .06, ease: 'expo.inOut' }, .90).to('.proof-amber-wipe', { '--culture-fill': 1, duration: .018, ease: 'expo.inOut' }, .982);
      gsap.to('.proof-grid', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: proof, start: 'top bottom', end: 'bottom top', scrub: .6 } });

      const cultures = $('.ch-names');
      const culturePanels = $$('.culture');
      const fields = $$('.culture-field');
      if (desktop) {
        const cultureState = { p: 0 };
        gsap.set(culturePanels, { x: 0, opacity: 1 });
        gsap.set('.culture-object', { x: 0 });
        gsap.set('.culture-object img', { rotateY: -18, rotateX: 8, rotateZ: 6, scale: 1 });
        const drawCultures = () => {
          const p = cultureState.p;
          const { slot, local, change } = cultureFrame(p);
          const finale = ease(seg(p, .84, .89));
          culturePanels.forEach((panel, i) => {
            const alpha = i === slot ? 1 - change : i === slot + 1 ? change : 0;
            panel.style.opacity = String(alpha * (1 - finale));
            panel.style.visibility = alpha > .001 ? 'visible' : 'hidden';
            panel.style.transform = 'none';
            const object = panel.querySelector<HTMLElement>('.culture-object')!;
            object.style.transform = 'none';
            const img = object.querySelector('img')!;
            const turn = i === slot ? local * 8 + change * 65 : -65 * (1 - change);
            img.style.opacity = '1';
            img.style.clipPath = 'none';
            img.style.transform = `rotateY(${turn - 4}deg) rotateX(4deg) rotateZ(2deg)`;
            fields[i].style.opacity = String(alpha);
            panel.querySelector<HTMLElement>('.culture-ghost')!.style.transform = `translateX(${-local * 24}px) scale(1.8)`;
            cultureChars[i].forEach(char => { (char as HTMLElement).style.transform = `translateY(${i === slot + 1 ? (1 - change) * 100 : 0}%)`; });
            $$('.culture-rail i')[i].style.background = i === slot ? 'var(--ch-amber)' : 'var(--ch-line)';
          });
          $('.culture-rail').style.opacity = String(1 - finale);
          const final = $('.culture-finale');
          final.style.visibility = finale > 0 ? 'visible' : 'hidden';
          final.style.opacity = String(finale * (1 - ease(seg(p, .93, .965))));
          const fan = $$('.culture-fan img');
          fan.forEach((image, i) => { image.style.transform = `translateY(${(1 - finale) * 120}px) rotate(${(i - 2) * (1 - finale) * 12}deg)`; });
          final.querySelector<HTMLElement>('h2')!.style.transform = `translateY(${(1 - ease(seg(p, .87, .91))) * 96}px)`;
          $('.culture-clouds').style.transform = `translateY(${(1 - ease(seg(p, .94, 1))) * 120}%)`;
          // Match the dawn beneath the feather; no rectangular cloud is the boundary.
          $('.cultures-stage').style.backgroundColor = `color-mix(in srgb,var(--ch-dawn-ground) ${ease(seg(p, .94, 1)) * 100}%,var(--ch-jade))`;
          $('.culture-fields').style.opacity = String(1 - ease(seg(p, .95, .99)));
        };
        gsap.to(cultureState, { p: 1, ease: 'none', scrollTrigger: { trigger: cultures, start: 'top top', end: 'bottom bottom', scrub: .6 }, onUpdate: drawCultures });
        drawCultures();
      } else {
        culturePanels.forEach((panel, i) => {
          gsap.from(cultureChars[i], { yPercent: 112, stagger: .04, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: panel, start: 'top 65%', toggleActions: 'play none none reverse' } });
          gsap.fromTo(panel.querySelector('.culture-object img'), { y: 64, rotateY: -26, rotateX: 10, scale: 1.15, clipPath: 'inset(18% 0 0)' }, { y: -24, rotateY: 14, rotateX: -4, scale: 1, clipPath: 'inset(0% 0 0)', ease: 'power3.out', scrollTrigger: { trigger: panel, start: 'top 70%', end: 'bottom 20%', scrub: .6 } });
          gsap.to(panel.querySelector('.culture-ghost'), { yPercent: -20, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: .6 } });
        });
        gsap.fromTo('.culture-clouds', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'expo.inOut', scrollTrigger: { trigger: '.culture-finale', start: 'top 20%', end: 'bottom bottom', scrub: .6 } });
      }

      const close = $('.ch-close');
      gsap.to('.close-cloud-gate', { yPercent: -80, ease: 'none', scrollTrigger: { trigger: close, start: 'top bottom', end: 'top top', scrub: .6 } });
      gsap.from('.close-content, .close-qr', { autoAlpha: 0, ease: 'power3.out', scrollTrigger: { trigger: close, start: 'top 20%', end: 'top top', scrub: .6 } });
      gsap.fromTo('.close-envelope', { y: -24, rotateZ: -5 }, { y: 0, rotateZ: 2, ease: 'power3.out', scrollTrigger: { trigger: close, start: 'top bottom', end: 'top top', scrub: .6 } });
      gsap.to('.close-envelope-flap', { rotateX: -155, ease: 'expo.inOut', scrollTrigger: { trigger: close, start: 'top 65%', end: '30% bottom', scrub: .6 } });
      gsap.from('.close-envelope-light', { scale: .2, opacity: .15, ease: 'expo.inOut', scrollTrigger: { trigger: close, start: 'top 65%', end: '30% bottom', scrub: .6 } });
      gsap.to('.close-dawn', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: close, start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.to('.close-cloud-far', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: close, start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.to('.close-cloud-near', { yPercent: -25, ease: 'none', scrollTrigger: { trigger: close, start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.to('.close-qr-specular', { xPercent: 250, ease: 'power3.out', scrollTrigger: { trigger: '.close-qr', start: 'top 95%', end: 'top 30%', scrub: .6 } });
      gsap.from('.footer-grid', { y: 48, ease: 'power3.out', scrollTrigger: { trigger: '.ch-footer', start: 'top bottom', end: 'top 50%', scrub: .6 } });
      $('[data-wordmark]').parentElement!.style.setProperty('--wordmark-sky', `url(${$('.close-dawn').getAttribute('src')})`);
      const wordmark = SplitText.create($('[data-wordmark]'), { type: 'chars', charsClass: 'wordmark-char' });
      splits.push(wordmark);
      gsap.from(wordmark.chars, { yPercent: 100, stagger: .025, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.footer-wordmark', start: 'top bottom', end: 'clamp(bottom bottom)', scrub: .6 } });
      gsap.to('.footer-wordmark', { '--sky-pan': '70%', duration: 22, repeat: -1, yoyo: true, ease: 'none', scrollTrigger: { trigger: '.ch-footer', start: 'top bottom', end: 'bottom top', toggleActions: 'play pause resume pause' } });
      if (desktop) $$('[data-magnetic]').forEach(button => {
        const move = (event: PointerEvent) => context.add(() => { const r = button.getBoundingClientRect(); gsap.to(button, { x: (event.clientX - r.left - r.width / 2) * .16, y: (event.clientY - r.top - r.height / 2) * .2, duration: .6, ease: 'power3.out', overwrite: true }); });
        const leave = () => context.add(() => { gsap.to(button, { x: 0, y: 0, duration: .8, ease: 'power3.out', overwrite: true }); });
        button.addEventListener('pointermove', move); button.addEventListener('pointerleave', leave);
        removers.push(() => { button.removeEventListener('pointermove', move); button.removeEventListener('pointerleave', leave); });
      });
      return () => {
        resume?.kill(); removers.splice(0).forEach(remove => remove()); splits.splice(0).forEach(split => split.revert());
        originals.forEach(({ element, style, expanded }) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); if (expanded !== null) element.setAttribute('aria-expanded', expanded); });
        originalNumbers.forEach(({ element, text }) => { element.textContent = text; if (element.hasAttribute('data-counter')) element.removeAttribute('aria-label'); });
      };
    });
  }, root);

  // New language lines and late local/selected language fonts both change measurements.
  const refresh = () => {
    if (disposed) return;
    // Fit with real loaded glyphs, before splitting or after font swaps.
    $$('.culture-word').forEach(word => {
      word.style.fontSize = '';
      const range = document.createRange(); range.selectNodeContents(word);
      const measured = range.getBoundingClientRect().width;
      const available = word.clientWidth - 16;
      const size = parseFloat(getComputedStyle(word).fontSize);
      if (measured > available && measured > 0) word.style.fontSize = `${size * available / measured}px`;
    });
    const wordmark = $('[data-wordmark]');
    const plate = wordmark.parentElement!;
    plate.style.fontSize = '';
    const range = document.createRange(); range.selectNodeContents(wordmark);
    const measured = range.getBoundingClientRect().width;
    if (measured > 0) plate.style.fontSize = `${parseFloat(getComputedStyle(plate).fontSize) * plate.clientWidth * .99 / measured}px`;
    $$('.wordmark-char').forEach(char => char.style.setProperty('--sky-x', `${-char.offsetLeft}px`));
    ScrollTrigger.refresh();
  };
  const refreshFrame = requestAnimationFrame(refresh);
  void document.fonts.ready.then(refresh);
  document.fonts.addEventListener('loadingdone', refresh);
  window.addEventListener('resize', refresh);
  return () => { disposed = true; cancelAnimationFrame(refreshFrame); document.fonts.removeEventListener('loadingdone', refresh); window.removeEventListener('resize', refresh); media.revert(); context.revert(); root.closest('.hz-page')?.classList.remove('ch-footer-on', 'ch-close-on'); removers.forEach(remove => remove()); splits.forEach(split => split.revert()); };
}
