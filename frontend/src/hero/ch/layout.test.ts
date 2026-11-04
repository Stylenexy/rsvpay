import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { cultureFrame, orbitCardFrame, orbitFrame, particleCount, proofFrame } from './layout';

describe('orbit composition', () => {
  it.each([[1600, 800], [1024, 600], [360, 740], [390, 844], [760, 660]])('hands the entire edge-on disc to the 96 px rule at %ix%i', (width, height) => {
    for (const p of [.93, .96, 1]) {
      const frame = orbitFrame(width, height, p);
      const camera = new PerspectiveCamera(35, width / height, .1, 100);
      camera.position.z = 14;
      camera.setViewOffset(width, height, (.5 - frame.centerX) * width, (.5 - frame.centerY) * height, width, height);
      camera.updateMatrixWorld();
      const xs: number[] = [];
      for (let i = 0; i < 720; i++) {
        const a = i * Math.PI / 360;
        const point = new Vector3(Math.cos(a) * 11, Math.sin(a) * 11, 0).applyEuler(new Euler(frame.angle, 0, 0)).multiplyScalar(frame.scale).project(camera);
        expect((1 - point.y) * height / 2).toBeCloseTo(96, 8);
        xs.push((1 + point.x) * width / 2);
      }
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeGreaterThan(width);
    }
  });

  it('opens at 56%, 47% with a 14 degree inclination', () => {
    const frame = orbitFrame(1600, 800, 0);
    expect(frame.centerX).toBe(.56);
    expect(frame.centerY).toBe(.47);
    expect(frame.angle * 180 / Math.PI).toBeCloseTo(76);
  });

  it('keeps the requested desktop, phone and low-power particle budgets', () => {
    expect(particleCount(false, false)).toBe(32000);
    expect(particleCount(true, false)).toBe(16000);
    expect(particleCount(false, true)).toBe(10666);
    expect(particleCount(true, true)).toBe(10666);
  });
});

describe('card safe frame', () => {
  it.each([[1600, 800, 510], [1024, 600, 340], [360, 740, 450], [360, 640, 365], [760, 660, 380]])('keeps the complete orbit inside %ix%i and between navigation and title', (width, height, titleTop) => {
    for (let i = 0; i < 360; i++) {
      const frame = orbitCardFrame(width, height, titleTop, i * Math.PI / 180);
      const halfHeight = frame.width * 680 / 960 / 2;
      expect(frame.width).toBeLessThanOrEqual(260);
      expect(frame.x - frame.width / 2).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.width / 2).toBeLessThanOrEqual(width);
      expect(frame.y - halfHeight).toBeGreaterThanOrEqual(104);
      expect(frame.y + halfHeight).toBeLessThanOrEqual(titleTop - 16);
    }
  });
});

describe('proof handoffs', () => {
  it('holds each proof for 70%, then overlaps the next for 30%', () => {
    for (let slot = 0; slot < 4; slot++) {
      for (const fraction of [0, .35, .7]) expect(proofFrame(.04 + (slot + fraction) * .17).weights[slot]).toBeCloseTo(1);
      const halfway = proofFrame(.04 + (slot + .85) * .17);
      expect(halfway.weights[slot]).toBeCloseTo(.5);
      expect(halfway.weights[slot + 1]).toBeCloseTo(.5);
    }
  });
  it('always shows a number and object, then holds the live receipt through the wipe', () => {
    for (let i = 0; i <= 1000; i++) {
      const { weights } = proofFrame(i / 1000);
      expect(Math.max(...weights)).toBeGreaterThanOrEqual(.5);
      expect(weights.reduce((sum, alpha) => sum + alpha, 0)).toBeCloseTo(1);
    }
    expect(proofFrame(.94).weights[4]).toBe(1);
  });
});

describe('culture holds', () => {
  it('keeps every culture fully present through 65% of its span', () => {
    const span = .84 / 5;
    for (let slot = 0; slot < 5; slot++) {
      for (const fraction of [.01, .3, .65]) {
        const frame = cultureFrame((slot + fraction) * span);
        expect(frame.slot).toBe(slot);
        expect(frame.change).toBeCloseTo(0, 12);
      }
    }
  });

  it('changes only during the final 35%, and keeps the last culture at full strength', () => {
    const span = .84 / 5;
    expect(cultureFrame(.825 * span).change).toBeCloseTo(.5);
    expect(cultureFrame(.999 * span).change).toBeGreaterThan(.99);
    expect(cultureFrame(4.99 * span)).toMatchObject({ slot: 4, change: 0 });
  });
});
