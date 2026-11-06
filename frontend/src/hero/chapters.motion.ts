import { gsap, ScrollTrigger, SplitText } from './ch/animation';
import { clamp, ease, lerp, seg } from './math';
import { cultureFrame, roundFrame } from './ch/layout';

const SCRUB = .6;
// Browsers skip painting at opacity 0, so the first visible frame would pay for all of it. This is too faint to see and still paints.
const FAINT = .01;

/** ScrollTrigger reads the hero's scroll; it never pins, snaps or writes it. Sections stay transparent: only the sky owns colour. */
export function mountChapters(root: HTMLElement) {
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const $$ = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  const splits: SplitText[] = [];
  const removers: (() => void)[] = [];
  let disposed = false;
  const media = gsap.matchMedia();
  const page = root.closest<HTMLElement>('.hz-page')!;
  const pin = page.querySelector<HTMLElement>('.hz-pin')!;

  // ScrollTrigger keeps the last scroll position it read. Coming back from another page, that number is from the old page.
  ScrollTrigger.clearScrollMemory();
  ScrollTrigger.refresh();

  const context = gsap.context(() => {
    // Whatever sits past the story waits until the story is nearly over, then decodes while nothing is moving.
    ScrollTrigger.create({ trigger: pin, start: 'bottom 420%', once: true, onEnter: () => {
      for (const image of $$('[data-late]') as HTMLImageElement[]) { image.src = image.dataset.late!; void image.decode().catch(() => undefined); }
    } });
    ScrollTrigger.create({ trigger: '.ch-footer', start: 'top 88px', end: 'bottom top', toggleClass: { targets: page, className: 'ch-footer-on' } });
    ScrollTrigger.create({ trigger: '.ch-round', start: 'top 60%', endTrigger: '.ch-close', end: 'bottom top', toggleClass: { targets: page, className: 'ch-stage-on' } });
    media.add({ reduced: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 761px)', phone: '(max-width: 760px)' }, (mm) => {
      const { reduced, desktop } = mm.conditions!;
      const originals = [root, ...$$('*')].map(element => ({ element, style: element.getAttribute('style'), expanded: element.getAttribute('aria-expanded') }));
      const originalNumbers = $$('[data-split]').map(element => ({ element, text: element.textContent }));
      const restore = () => {
        originals.forEach(({ element, style, expanded }) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); if (expanded !== null) element.setAttribute('aria-expanded', expanded); });
        originalNumbers.forEach(({ element, text }) => { element.textContent = text; });
      };

      const sky = $('.ch-sky');
      if (reduced) {
        gsap.set(sky, { autoAlpha: 0 });
        ScrollTrigger.create({ trigger: root, start: 'top bottom', onEnter: () => gsap.set(sky, { autoAlpha: 1 }), onLeaveBack: () => gsap.set(sky, { autoAlpha: 0 }) });
        return restore;
      }

      // ---- one sky: each change takes a full screen of scroll, and the same clouds carry both big moves
      const [, gold, blue, morning] = $$('.ch-sky > img');
      const shade = $('.ch-sky-shade');
      const clouds = $('.ch-sky-clouds');
      const grounds = $('.ch-sky-scenes');
      // Sky and clouds wake a few screens early, while nothing is moving, and sleep again when their pass is over.
      const wake = (element: HTMLElement, trigger: gsap.DOMTarget, start: string, end: string) => ScrollTrigger.create({ trigger, start, end, onToggle: self => { element.style.visibility = self.isActive ? 'visible' : 'hidden'; } });
      const stayAwake = (element: HTMLElement, trigger: gsap.DOMTarget, start: string) => ScrollTrigger.create({ trigger, start, onEnter: () => { element.style.visibility = 'visible'; }, onLeaveBack: () => { element.style.visibility = 'hidden'; } });
      stayAwake(sky, pin, 'bottom 320%');
      wake(clouds, pin, 'bottom 320%', 'bottom 40%');
      wake(clouds, '.ch-close', 'top 300%', 'top 10%');
      wake(grounds, '.ch-names', 'top 320%', 'bottom top');
      // Only the layers in play stay awake: a layer sleeps until two screens before its turn and again once it is covered.
      wake(gold, '.ch-names', 'top 300%', 'top -110%');
      wake(blue, '.ch-names', 'top 200%', 'bottom top');
      stayAwake(morning, '.ch-names', 'bottom 300%');
      gsap.fromTo(sky, { opacity: FAINT }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'bottom 140%', end: 'bottom 112%', scrub: SCRUB } });
      const cloudPass = (trigger: gsap.DOMTarget, start: string, end: string) => gsap.timeline({ scrollTrigger: { trigger, start, end, scrub: SCRUB } })
        .fromTo(clouds, { opacity: FAINT, yPercent: 46 }, { opacity: 1, yPercent: 0, duration: .45, ease: 'power1.out', immediateRender: false }, 0)
        .to(clouds, { opacity: FAINT, yPercent: -46, duration: .55, ease: 'power1.in' }, .45);
      gsap.set(clouds, { opacity: FAINT });
      cloudPass(pin, 'bottom 165%', 'bottom 60%');
      cloudPass('.ch-close', 'top 135%', 'top 20%');
      gsap.fromTo(gold, { opacity: FAINT }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.ch-names', start: 'top bottom', end: 'top top', scrub: SCRUB } });
      gsap.fromTo(blue, { opacity: FAINT }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.ch-names', start: 'top top', end: 'top -100%', scrub: SCRUB } });
      gsap.fromTo(shade, { opacity: 1 }, { opacity: .45, ease: 'none', scrollTrigger: { trigger: '.ch-names', start: 'top bottom', end: 'top -100%', scrub: SCRUB } });
      gsap.fromTo(morning, { opacity: FAINT }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.ch-close', start: 'top 120%', end: 'top 30%', scrub: SCRUB } });
      gsap.to(shade, { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ch-close', start: 'top 120%', end: 'top 30%', scrub: SCRUB } });

      // SplitText owns its masks, including reflow when a language font arrives.
      for (const element of $$('[data-lines]')) {
        const split = SplitText.create(element, {
          type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'ch-split-line',
          onSplit: self => gsap.from(self.lines, { yPercent: 112, stagger: .075, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none reverse' } }),
        });
        splits.push(split);
      }

      // ---- 02: scroll opens the four panels in turn; the pointer can borrow them for a moment
      const wedding = $('.ch-table');
      const row = $('.cp-row');
      const heading = $('.wedding-heading');
      const panels = $$('.cp');
      const parts = panels.map(panel => ({ picture: panel.querySelector<HTMLElement>('.cp-picture img')!, progress: panel.querySelector<HTMLElement>('.cp-progress i')! }));
      const splitNumbers = $$('[data-split]');
      const locale = root.closest<HTMLElement>('[data-lang]')?.dataset.lang || 'en';
      const control = { selected: 0, mix: 0 };
      const weddingState = { p: 0 };
      let rowFrom = 0;
      let column = 0;
      const measureRow = () => {
        rowFrom = heading.offsetTop + heading.offsetHeight + 32;
        column = (row.clientWidth - 3 * 12) / (4 + 2.6);
        row.style.setProperty('--panel-copy', `${desktop ? Math.min(560, column * 3.6 - 64) : row.clientWidth - 32}px`);
      };
      const drawPanels = () => {
        const p = weddingState.p;
        const gone = ease(seg(p, .02, .1));
        const auto = seg(p, .13, .93) * 3;
        const position = auto * (1 - control.mix) + control.selected * control.mix;
        const exit = ease(seg(p, .96, 1));
        heading.style.opacity = String(1 - gone);
        row.style.top = `${lerp(rowFrom, parseFloat(getComputedStyle(row).getPropertyValue('--row-top')) || 96, gone)}px`;
        row.style.opacity = String(1 - exit);
        row.style.transform = `translateY(${-exit * 32}px)`;
        panels.forEach((panel, i) => {
          const opening = ease(clamp(1 - Math.abs(position - i)));
          if (desktop) panel.style.flex = `0 0 ${column + opening * 2.6 * column}px`;
          else panel.style.flex = `${1 + opening * 7} 1 0`;
          panel.style.setProperty('--open', opening.toFixed(3));
          panel.setAttribute('aria-expanded', String(opening > .5));
          parts[i].picture.style.transform = `translate3d(0,${(p - .5) * (i % 2 ? -5 : 5)}%,0) scale(${1.14 - opening * .08})`;
          parts[i].progress.style.transform = `scaleX(${clamp(position - i + .5)})`;
        });
        const split = ease(clamp(1 - Math.abs(position - 2)));
        splitNumbers.forEach(el => { el.textContent = `Rp${(Math.round(Number(el.dataset.split) * split / 100) * 100).toLocaleString(locale)}`; });
      };
      gsap.to(weddingState, { p: 1, ease: 'none', scrollTrigger: { trigger: wedding, start: 'top top', end: 'bottom bottom', scrub: SCRUB }, onUpdate: drawPanels });
      let resume: gsap.core.Tween | undefined;
      let lastScroll = 0;
      const onScroll = () => { lastScroll = performance.now(); };
      window.addEventListener('scroll', onScroll, { passive: true });
      removers.push(() => window.removeEventListener('scroll', onScroll));
      panels.forEach((panel, i) => {
        const take = (event: Event) => context.add(() => {
          // panels sliding under a resting cursor are not a request
          if (event.type === 'pointerenter' && performance.now() - lastScroll < 300) return;
          resume?.kill();
          gsap.to(control, { selected: i, mix: 1, duration: .65, ease: 'power3.out', overwrite: true, onUpdate: drawPanels });
          resume = gsap.delayedCall(2.6, () => { gsap.to(control, { mix: 0, duration: 1.1, ease: 'power3.out', onUpdate: drawPanels }); });
        });
        for (const event of ['pointerenter', 'click', 'focus']) { panel.addEventListener(event, take); removers.push(() => panel.removeEventListener(event, take)); }
      });
      const redraw = () => { measureRow(); drawPanels(); };
      redraw();
      window.addEventListener('resize', redraw);
      removers.push(() => window.removeEventListener('resize', redraw));
      gsap.from(row, { y: 72, opacity: FAINT, ease: 'power2.out', scrollTrigger: { trigger: wedding, start: 'top 85%', end: 'top 20%', scrub: SCRUB } });

      // ---- 03: one envelope, one letter at a time; it turns over to be sent back
      const round = $('.ch-round');
      const letters = $$('.round-letter');
      const envelope = $('.round-envelope');
      const fill = $('.round-rail i');
      const years = $$('.round-rail li');
      const roundState = { p: 0 };
      const drawRound = () => {
        const { rises, turn, year, fill: filled } = roundFrame(roundState.p);
        letters.forEach((letter, i) => {
          letter.style.opacity = String(clamp(rises[i] * 5));
          letter.style.transform = `translate3d(0,${-rises[i] * 86}%,0)`;
        });
        envelope.style.transform = `rotateY(${turn * 180}deg)`;
        fill.style.transform = `scaleX(${filled})`;
        years.forEach((el, i) => el.classList.toggle('on', i <= year));
      };
      gsap.to(roundState, { p: 1, ease: 'none', scrollTrigger: { trigger: round, start: 'top top', end: 'bottom bottom', scrub: SCRUB }, onUpdate: drawRound });
      drawRound();
      gsap.from('.round-copy, .round-scene', { y: 64, opacity: FAINT, stagger: .08, ease: 'power2.out', scrollTrigger: { trigger: round, start: 'top 100%', end: 'top 30%', scrub: SCRUB } });
      gsap.to('.round-stage', { opacity: 0, ease: 'none', scrollTrigger: { trigger: round, start: 'bottom 114%', end: 'bottom 100%', scrub: SCRUB } });

      // ---- 04: the page itself scrolls; each row arrives, makes its point, and clears the bar above
      const proofRows = $$('.proof-row, .proof-live');
      const steps = $$('.proof-steps li');
      proofRows.forEach((proofRow, i) => {
        gsap.from([...proofRow.children], { y: 56, opacity: FAINT, stagger: .06, ease: 'power2.out', scrollTrigger: { trigger: proofRow, start: 'top 92%', end: 'top 58%', scrub: SCRUB } });
        gsap.to(proofRow, { opacity: 0, ease: 'none', scrollTrigger: { trigger: proofRow, start: i === 4 ? 'center 20%' : 'center 36%', end: i === 4 ? 'center 2%' : 'center 16%', scrub: SCRUB } });
        ScrollTrigger.create({ trigger: proofRow, start: 'top 60%', end: 'bottom 60%', toggleClass: { targets: steps[i], className: 'on' } });
      });
      gsap.timeline({ scrollTrigger: { trigger: '.proof-row-0', start: 'top 55%', end: 'center 40%', scrub: SCRUB } })
        .to('.proof-key-whole', { opacity: 0, duration: .5, ease: 'none' }, .25)
        .fromTo('.proof-key-broken', { opacity: FAINT, scale: .97 }, { opacity: 1, scale: 1, duration: .6, ease: 'none' }, .2);
      $$('.proof-list').forEach(list => {
        gsap.fromTo(list.children, { opacity: .28 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 72%', end: 'bottom 52%', scrub: SCRUB } });
      });
      gsap.fromTo('.seal-arc', { '--seal-amount': 0 }, { '--seal-amount': 10, ease: 'power2.out', scrollTrigger: { trigger: '.proof-seal', start: 'top 74%', end: 'center 50%', scrub: SCRUB } });
      gsap.to('.proof-side', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ch-proof', start: 'bottom 90%', end: 'bottom 66%', scrub: SCRUB } });

      // ---- 05: one envelope at a time, each on its own material; the five only meet at the end
      const names = $('.ch-names');
      const stage = $('.names-stage');
      const cultures = $$('.culture');
      const groundImages = $$('.ch-sky-scenes img') as HTMLImageElement[];
      const scenes = cultures.map(scene => {
        const word = SplitText.create(scene.querySelector('.culture-word')!, { type: 'chars', mask: 'chars', charsClass: 'culture-char' });
        splits.push(word);
        return { scene, copy: scene.querySelector<HTMLElement>('.culture-copy')!, object: scene.querySelector<HTMLElement>('.culture-object')!, chars: word.chars as HTMLElement[] };
      });
      const railStops = $$('.culture-rail li');
      const finaleBlock = $('.culture-finale');
      const fan = $$('.culture-fan img');
      const nameState = { p: 0 };
      // Grounds and cut-outs arrive and decode well ahead, so none lands in the middle of a scroll.
      ScrollTrigger.create({ trigger: names, start: 'top 320%', once: true, onEnter: () => {
        groundImages.forEach(image => { image.src = image.dataset.ground!; void image.decode().catch(() => undefined); });
        $$('.culture-object img, .culture-fan img').forEach(image => { (image as HTMLImageElement).loading = 'eager'; void (image as HTMLImageElement).decode().catch(() => undefined); });
      } });
      gsap.fromTo(grounds, { opacity: FAINT }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: names, start: 'top 90%', end: 'top 5%', scrub: SCRUB } });
      const drawNames = () => {
        const { slot, local, change, clear, finale, leave } = cultureFrame(nameState.p);
        grounds.style.setProperty('--scene-out', String(clear));
        groundImages.forEach((image, i) => {
          const awake = i === slot || i === slot + 1;
          image.style.visibility = awake ? 'visible' : 'hidden';
          image.style.opacity = String(i === slot ? 1 - clear : i === slot + 1 ? change : 0);
          if (awake) image.style.transform = `scale(${1.07 - (i === slot ? local : 0) * .07})`;
        });
        scenes.forEach(({ scene, copy, object, chars }, i) => {
          const current = i === slot;
          const next = i === slot + 1;
          scene.style.visibility = current || next ? 'visible' : 'hidden';
          if (!current && !next) return;
          const out = current ? ease(seg(change, 0, .5)) + clear : 0;
          const arrive = next ? ease(seg(change, .45, 1)) : 1;
          copy.style.opacity = String((1 - clamp(out)) * arrive);
          copy.style.transform = `translate3d(0,${(1 - arrive) * 28 - clamp(out) * 28}px,0)`;
          object.style.opacity = String((1 - clamp(out)) * arrive);
          object.style.transform = `translate3d(${(1 - arrive) * 48 - clamp(out) * 48}px,${Math.sin(local * Math.PI) * -10}px,0) rotateY(${(1 - arrive) * -58 + clamp(out) * 44 + (current ? (local - .5) * 7 : 0)}deg)`;
          chars.forEach((char, n) => { char.style.transform = `translate3d(0,${(1 - clamp(arrive * 1.5 - n * .07)) * 110}%,0)`; });
        });
        railStops.forEach((stop, i) => stop.classList.toggle('on', i === (change > .5 ? slot + 1 : slot)));
        $('.culture-rail').style.opacity = String(1 - clear);
        finaleBlock.style.visibility = finale > 0 ? 'visible' : 'hidden';
        finaleBlock.style.opacity = String(finale * (1 - leave));
        fan.forEach((image, i) => { image.style.transform = `translate3d(0,${(1 - finale) * 96}px,0) rotate(${(i - 2) * (3 + (1 - finale) * 9)}deg)`; });
      };
      gsap.to(nameState, { p: 1, ease: 'none', scrollTrigger: { trigger: names, start: 'top top', end: 'bottom bottom', scrub: SCRUB }, onUpdate: drawNames });
      drawNames();
      gsap.from(stage, { opacity: FAINT, y: 56, ease: 'power2.out', scrollTrigger: { trigger: names, start: 'top 80%', end: 'top 5%', scrub: SCRUB } });
      if (desktop) {
        const tilts = $$('.culture-tilt');
        const lean = tilts.map(tilt => ({ x: gsap.quickTo(tilt, 'rotationY', { duration: .9, ease: 'power3.out' }), y: gsap.quickTo(tilt, 'rotationX', { duration: .9, ease: 'power3.out' }) }));
        const onLean = (event: PointerEvent) => { const x = event.clientX / window.innerWidth - .5; const y = event.clientY / window.innerHeight - .5; lean.forEach(l => { l.x(x * 16); l.y(y * -12); }); };
        stage.addEventListener('pointermove', onLean);
        removers.push(() => stage.removeEventListener('pointermove', onLean));
      }

      // ---- 06: morning, and the envelope opens on its own
      const close = $('.ch-close');
      gsap.fromTo('.close-envelope', { y: 96, opacity: FAINT, rotateZ: -4 }, { y: 0, opacity: 1, rotateZ: 0, ease: 'power2.out', scrollTrigger: { trigger: close, start: 'top 45%', end: 'top top', scrub: SCRUB } });
      gsap.from('.close-content, .close-qr', { y: 48, opacity: FAINT, stagger: .06, ease: 'power2.out', scrollTrigger: { trigger: close, start: 'top 40%', end: 'top top', scrub: SCRUB } });
      gsap.to('.close-envelope-flap', { rotateX: -155, ease: 'power2.inOut', scrollTrigger: { trigger: close, start: 'top 30%', end: 'top -10%', scrub: SCRUB } });
      gsap.from('.close-envelope-light', { scale: .2, opacity: .15, ease: 'power2.inOut', scrollTrigger: { trigger: close, start: 'top 30%', end: 'top -10%', scrub: SCRUB } });
      // ---- the footer rises over the morning as a page of its own, and the name comes up out of the clouds
      const footer = $('.ch-footer');
      gsap.to('.close-stage > *', { opacity: .25, scale: .95, ease: 'none', scrollTrigger: { trigger: footer, start: 'top 95%', end: 'top 25%', scrub: SCRUB } });
      gsap.from('.footer-head, .footer-column', { y: 56, opacity: FAINT, stagger: .05, ease: 'power2.out', scrollTrigger: { trigger: footer, start: 'top 75%', end: 'top 10%', scrub: SCRUB } });
      gsap.from('[data-wordmark]', { yPercent: 104, ease: 'power3.out', scrollTrigger: { trigger: '.footer-wordmark', start: 'top 98%', end: 'bottom 100%', scrub: SCRUB } });
      gsap.fromTo('.footer-wordmark', { '--sky-pan': '20%' }, { '--sky-pan': '80%', duration: 26, repeat: -1, yoyo: true, ease: 'none', scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom top', toggleActions: 'play pause resume pause' } });
      if (desktop) $$('[data-magnetic]').forEach(button => {
        const move = (event: PointerEvent) => context.add(() => { const r = button.getBoundingClientRect(); gsap.to(button, { x: (event.clientX - r.left - r.width / 2) * .16, y: (event.clientY - r.top - r.height / 2) * .2, duration: .6, ease: 'power3.out', overwrite: true }); });
        const leave = () => context.add(() => { gsap.to(button, { x: 0, y: 0, duration: .8, ease: 'power3.out', overwrite: true }); });
        button.addEventListener('pointermove', move); button.addEventListener('pointerleave', leave);
        removers.push(() => { button.removeEventListener('pointermove', move); button.removeEventListener('pointerleave', leave); });
      });
      return () => {
        resume?.kill(); removers.splice(0).forEach(remove => remove()); splits.splice(0).forEach(split => split.revert());
        restore();
      };
    });
  }, root);

  // New language lines and late local/selected language fonts both change measurements.
  const fitWordmark = () => {
    const plate = root.querySelector<HTMLElement>('.footer-wordmark')!;
    plate.style.fontSize = '';
    const word = root.querySelector<HTMLElement>('[data-wordmark]')!;
    const range = document.createRange();
    range.selectNodeContents(word);
    const measured = range.getBoundingClientRect().width;
    if (measured > 0) plate.style.fontSize = `${Math.min(parseFloat(getComputedStyle(plate).fontSize) * plate.clientWidth / measured, window.innerHeight * .3)}px`;
  };
  const refresh = () => { if (disposed) return; fitWordmark(); ScrollTrigger.refresh(); };
  const refreshFrame = requestAnimationFrame(refresh);
  void document.fonts.ready.then(refresh);
  document.fonts.addEventListener('loadingdone', refresh);
  window.addEventListener('resize', fitWordmark);
  return () => { disposed = true; cancelAnimationFrame(refreshFrame); document.fonts.removeEventListener('loadingdone', refresh); window.removeEventListener('resize', fitWordmark); media.revert(); context.revert(); page.classList.remove('ch-footer-on', 'ch-stage-on'); removers.forEach(remove => remove()); splits.forEach(split => split.revert()); };
}
