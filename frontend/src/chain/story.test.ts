import { describe, expect, it, vi } from 'vitest';
import { MockAmplopClient } from './mock';
import { RECORDED, replyDeposit, replyStory, startStory, type StoryMark } from './story';
import { REPLY_MARGIN_YOCTO, STORAGE_BYTE_YOCTO, chainRp, replyStorageYocto, rupiahToYocto } from '../lib/rupiah';
import { readFileSync } from 'node:fs';

describe('the story stops for the person, with one public account request', () => {
  it('funds the second person from the first, rings, then replies once and links both books', async () => {
    const c = new MockAmplopClient();
    const helper = vi.spyOn(c, 'createAccount');
    const child = vi.spyOn(c, 'createSubAccount');
    const send = vi.spyOn(c, 'reciprocate');
    const marks: StoryMark[] = [];
    let clock = 0;
    const session = await startStory(c, { gift: 'Congratulations', reply: 'Your turn' }, (m) => marks.push(m), () => {}, () => true, () => clock += 50);
    expect(helper).toHaveBeenCalledTimes(1);
    expect(child).toHaveBeenCalledTimes(1);
    expect(session.budi.endsWith('.' + session.siti)).toBe(true);
    expect(await c.balance(session.budi)).not.toBe('10000000000000000000000000');
    expect(send).not.toHaveBeenCalled();
    expect((await c.hajatan(session.celebration))?.entries).toBe(0);
    expect(marks.map((m) => m.step)).toEqual(['account', 'family', 'wedding', 'gift', 'years', 'celebration', 'ring']);
    expect(marks.filter((m) => m.ms > 0).every((m) => m.ms === 50)).toBe(true);
    const r = await replyStory(c, session, 'Your turn');
    expect(r.value.reply_to).toEqual({ token_id: session.wedding, entry: session.pending.entry });
    expect((await c.entries(session.wedding))[0].replied).toEqual({ token_id: session.celebration, entry: r.value.index });
    await replyStory(c, session, 'Try after a lost response');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('stops after a helper refusal and never invents later steps', async () => {
    const c = new MockAmplopClient();
    vi.spyOn(c, 'createAccount').mockRejectedValue(new Error('helper 429'));
    const child = vi.spyOn(c, 'createSubAccount');
    const marks = vi.fn();
    await expect(startStory(c, { gift: '', reply: '' }, marks, () => {})).rejects.toThrow('helper 429');
    expect(marks).not.toHaveBeenCalled();
    expect(child).not.toHaveBeenCalled();
  });

  it('does not start another call after the page is left', async () => {
    const c = new MockAmplopClient();
    const make = vi.spyOn(c, 'createAccount');
    await expect(startStory(c, { gift: '', reply: '' }, () => {}, () => {}, () => false)).rejects.toThrow('story left');
    expect(make).not.toHaveBeenCalled();
  });

  it('attaches the top-up and storage margin, and uses only recorded hashes from the evidence file', () => {
    // the reply measured on testnet on 11 November 2026: 210 bytes of storage (docs/evidence/reply-amount-check.txt)
    const about = { from: '372', to: '373', caller: 'maya-4aaqqgm.rsvpay-dana-3ddy.testnet', message: 'Your turn to celebrate, Sam. Wishing you happiness.' };
    expect(about.caller.length).toBe(37);
    expect(new TextEncoder().encode(about.message).length).toBe(51);
    // the entry number has one digit there and two are assumed, so the estimate is one byte above the 210 measured
    expect(replyStorageYocto(about)).toBe(211n * STORAGE_BYTE_YOCTO);
    expect(BigInt(replyDeposit({ amount: '100', seed: '5' }, about))).toBe(95n + replyStorageYocto(about) + REPLY_MARGIN_YOCTO);
    // a $100 gift carries ~$0.60 of storage leftover; the reply must land as $100: not $99 (storage ate it), not $101
    const amount = rupiahToYocto(100_600);
    const seed = (amount * 500n) / 10_000n;
    const landed = seed + BigInt(replyDeposit({ amount: amount.toString(), seed: seed.toString() }, about)) - 210n * STORAGE_BYTE_YOCTO;
    expect(chainRp(landed)).toBe(chainRp(amount));
    expect(chainRp(amount) - chainRp(seed)).toBe(95_000);
    // a long wish in a three-byte script costs more storage and still lands the same amount
    const long = { ...about, message: '\u795d'.repeat(280) };
    const cost = replyStorageYocto(long) - STORAGE_BYTE_YOCTO;
    expect(chainRp(seed + BigInt(replyDeposit({ amount: amount.toString(), seed: seed.toString() }, long)) - cost)).toBe(chainRp(amount));
    const source = readFileSync(new URL('../../../docs/evidence/measured-testnet.txt', import.meta.url), 'utf8');
    for (const r of RECORDED) expect(source).toContain(r.hash);
  });
});
