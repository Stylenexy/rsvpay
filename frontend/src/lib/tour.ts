import type { AmplopClient } from '../chain/types';
import { people } from './people';
import { OPEN_DEPOSIT_YOCTO } from './rupiah';

export type TourEvent = { step: number; line: number; done: boolean; failed?: boolean };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const tourActive = () => new URLSearchParams(window.location.search).has('tour');

/** The demo runs on the rehearsal client: it needs no public service and leaves nothing on the network. */
export function startTour() {
  window.location.href = `${window.location.pathname}?mock&tour=1#/buka`;
}

async function until<T>(find: () => T | null | undefined, ms = 9000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() > end) throw new Error('the page did not reach the next step');
    await wait(120);
  }
}

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

/** Marks what the demo is touching and brings it into view. */
function spot(target: HTMLElement | null) {
  element('.tour-spot')?.classList.remove('tour-spot');
  if (!target) return;
  target.classList.add('tour-spot');
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Sets a React-controlled field the way a keystroke would. */
function setValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function type(input: HTMLInputElement, text: string) {
  spot(input);
  await wait(350);
  for (let i = 1; i <= text.length; i++) {
    setValue(input, text.slice(0, i));
    await wait(70);
  }
}

export async function runTour(client: AmplopClient, refresh: () => void, switchTo: (id: string) => void, report: (event: TourEvent) => void, who: ReturnType<typeof people>) {
  let reached = 0;
  const say = (step: number, line: number) => { reached = step; report({ step, line, done: false }); };
  try {
    window.location.hash = '#/buka';

    // 1: the couple makes an envelope
    say(0, 0);
    await type(await until(() => element<HTMLInputElement>('.open-page input:not([type=date])')), who.couple);
    await wait(500);
    const date = await until(() => element<HTMLInputElement>('.open-page input[type=date]'));
    spot(date);
    await wait(500);
    setValue(date, '2026-12-12');
    await wait(800);
    const share = await until(() => element('.open-page .seg button:nth-child(4)'));
    spot(share);
    await wait(500);
    share.click();
    await wait(900);
    const host = document.querySelectorAll<HTMLInputElement>('.open-page input:not([type=date])')[1];
    if (host) await type(host, who.host);
    await wait(600);
    const open = await until(() => element('.open-page button[type=submit]'));
    spot(open);
    await wait(800);
    open.click();
    const book = await until(() => window.location.hash.match(/buku\/([^/?]+)/)?.[1]);
    const siti = client.account()!;
    say(1, 1);
    spot(await until(() => element('.share')));
    await wait(3400);

    // 2: a guest scans and gives
    say(1, 2);
    const budi = await client.createAccount(who.guest);
    refresh();
    window.location.hash = `#/beri/${book}`;
    await until(() => element('.give-card'));
    await wait(1000);
    await type(await until(() => element<HTMLInputElement>('.give-card .wish')), who.wish);
    await wait(700);
    spot(await until(() => element('.give-card .slide')));
    await wait(900);
    (await until(() => element('.give-card .knob'))).click();
    spot(await until(() => element('.done')));
    await wait(3000);

    // 3: the book keeps it
    say(2, 3);
    switchTo(siti);
    window.location.hash = `#/buku/${book}`;
    spot(await until(() => element('.list li:not(.empty)')));
    await wait(3400);

    // 4: years later the guest celebrates, the envelope rings, the couple gives back
    say(3, 4);
    client.useAccount(budi);
    const next = await client.openHajatan({ title: who.second, date: '2028-11-18', seedBps: 500, depositYocto: OPEN_DEPOSIT_YOCTO.toString() });
    client.useAccount(siti);
    refresh();
    const reply = await until(() => element('.ring-card:not(.reply-card) .btn'), 12000);
    spot(reply);
    await wait(3000);
    say(3, 5);
    await wait(1500);
    reply.click();
    await until(() => !element('.ring-card:not(.reply-card) .btn'));
    await wait(1800);
    say(3, 6);
    switchTo(budi);
    window.location.hash = `#/buku/${next.value}`;
    spot(await until(() => element('.reply-card')));
    await wait(3200);
    spot(null);
    report({ step: 4, line: 6, done: true });
  } catch {
    spot(null);
    report({ step: reached, line: 0, done: true, failed: true });
  }
}
