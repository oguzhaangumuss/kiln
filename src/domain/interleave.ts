/** Round-robin merge. Shorter groups run out; nothing is padded. */
export function interleaveRoundRobin<T>(groups: T[][], idOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const copies = groups.map((group) => [...group]);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const group of copies) {
      while (group.length > 0) {
        const next = group.shift();
        if (!next) break;
        const id = idOf(next);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(next);
        progressed = true;
        break;
      }
    }
  }
  return out;
}
