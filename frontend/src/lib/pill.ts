import { useLayoutEffect, useRef } from 'react';

/** The pill rests on the chosen language and slides to the one under the pointer, without changing the language. */
export function useLangPill<T extends HTMLElement>(lang: string) {
  const root = useRef<T>(null);
  useLayoutEffect(() => {
    const box = root.current;
    const pill = box?.querySelector<HTMLElement>('.lang-pill');
    if (!box || !pill) return;
    const chosen = () => box.querySelector<HTMLElement>('button[aria-pressed="true"]');
    const moveTo = (button: HTMLElement | null) => {
      if (!button) return;
      pill.style.width = `${button.offsetWidth}px`;
      pill.style.height = `${button.offsetHeight}px`;
      pill.style.transform = `translate(${button.offsetLeft}px, ${button.offsetTop}px)`;
      box.toggleAttribute('data-peek', button !== chosen());
      box.querySelectorAll('button').forEach((each) => each.toggleAttribute('data-under', each === button));
    };
    const rest = () => moveTo(chosen());
    const peek = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') moveTo((event.target as Element).closest('button'));
    };
    pill.style.transition = 'none';
    rest();
    const settled = requestAnimationFrame(() => { pill.style.transition = ''; });
    box.addEventListener('pointerover', peek);
    box.addEventListener('pointerleave', rest);
    const size = new ResizeObserver(rest);
    size.observe(box);
    return () => {
      cancelAnimationFrame(settled);
      box.removeEventListener('pointerover', peek);
      box.removeEventListener('pointerleave', rest);
      size.disconnect();
    };
  }, [lang]);
  return root;
}
