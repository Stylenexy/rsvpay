import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

export function usePageMotion(root: RefObject<HTMLElement | null>, ready = true) {
  useLayoutEffect(() => {
    if (!ready || !root.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.from('.form-panel', { y: 28, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity' });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [root, ready]);
}

export function useBookMotion(root: RefObject<HTMLElement | null>, signature: string, ringing: boolean) {
  useLayoutEffect(() => {
    if (!root.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.from('.list li', { opacity: 0, y: 16, stagger: 0.07, duration: 0.65, ease: 'power2.out', clearProps: 'all' });
        gsap.from('.story-timeline li[data-state="done"]', { opacity: 0.5, y: 5, duration: 0.45, ease: 'power2.out', clearProps: 'transform,opacity' });
        if (ringing) {
          gsap.from('.ring-card', { y: 26, scale: 0.96, duration: 1, ease: 'elastic.out(1, 0.7)', clearProps: 'transform' });
          gsap.fromTo('.ring-orbit', { scale: 0.6, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 2.2, repeat: 2, ease: 'power2.out' });
        }
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [root, signature, ringing]);
}
