import { describe, expect, it } from 'vitest';
import { firstFree, isVisitorAccount, takeSlot } from '../api/dana';

const PURSE = 'rsvpay-dana-3ddy.testnet';

describe('the testnet purse only feeds visitors', () => {
  it('knows a visitor account and its children', () => {
    expect(isVisitorAccount(`maya-abcde12.${PURSE}`, PURSE)).toBe(true);
    expect(isVisitorAccount(`sam-abcde.maya-abcde12.${PURSE}`, PURSE)).toBe(true);
  });

  it('refuses its own markers, the purse and strangers', () => {
    expect(isVisitorAccount(`m0123456789abcdef0123.${PURSE}`, PURSE)).toBe(false);
    expect(isVisitorAccount(PURSE, PURSE)).toBe(false);
    expect(isVisitorAccount('maya-abcde12.testnet', PURSE)).toBe(false);
    expect(isVisitorAccount(`maya-abcde12.x${PURSE}`, PURSE)).toBe(false);
  });

  it('finds the first free slot by halving', async () => {
    const asked: number[] = [];
    const taken = async (i: number) => { asked.push(i); return i < 37; };
    expect(await firstFree(taken, 60)).toBe(37);
    expect(asked.length).toBeLessThanOrEqual(7);
    expect(await firstFree(async () => true, 6)).toBe(6);
  });

  it('moves to the next slot when another request wins the first', async () => {
    const won = new Set([2]);
    const claim = async (i: number) => !won.has(i);
    expect(await takeSlot(async (i) => i < 2, claim, 6)).toBe(true);
    expect(await takeSlot(async () => true, claim, 6)).toBe(false);
  });
});
