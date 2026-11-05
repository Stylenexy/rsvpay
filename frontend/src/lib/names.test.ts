import { describe, expect, it } from 'vitest';
import { titleLines } from './names';

describe('couple names', () => {
  it.each([['Siti & Andi', '&'], ['Siti&Andi', '&'], ['Siti dan Andi', 'dan'], ['Siti and Andi', 'and'], ['Siti DAN Andi', 'DAN'], ['Mai và Long', 'và']])('splits %s into name, connector, name', (title, connector) => {
    const lines = titleLines(title);
    expect(lines.map((line) => line.connector)).toEqual([false, true, false]);
    expect(lines[1].text).toBe(connector);
  });

  it('leaves a name that only contains the letters alone', () => {
    expect(titleLines('Amanda').map((line) => line.text)).toEqual(['Amanda']);
    expect(titleLines('Dania Andika').map((line) => line.text)).toEqual(['Dania Andika']);
  });

  it('leaves a normal sentence alone', () => {
    expect(titleLines('A beginning worth keeping.')).toHaveLength(1);
  });
});
