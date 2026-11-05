/** "Siti dan Andi" and "Siti & Andi" read as three lines: name, connector, name. */
export function titleLines(title: string) {
  return title.split(/\s+(&|and|dan|và|和|와|と)\s+|\s*(&)\s*/i).filter(Boolean).map((text, i) => ({ text, connector: i % 2 === 1 }));
}
