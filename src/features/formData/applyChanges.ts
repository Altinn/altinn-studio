interface Props {
  prev: any;
  next: any;
  applyTo: any;
}

/**
 * Takes a previous and next object, and applies the changes from next to prev to the applyTo object.
 */
export function applyChanges({ prev, next, applyTo }: Props) {
  const prevKeys = typeof prev === 'object' && prev ? Object.keys(prev) : [];
  const nextKeys = typeof next === 'object' && next ? Object.keys(next) : [];
  const keys = new Set([...prevKeys, ...nextKeys]);

  for (const key of keys) {
    const prevValue = typeof prev === 'object' && prev ? prev[key] : undefined;
    const nextValue = typeof next === 'object' && next ? next[key] : undefined;
    const current = typeof applyTo === 'object' && applyTo ? applyTo[key] : undefined;
    if (typeof prevValue === 'object' && typeof nextValue === 'object' && prevValue !== null && nextValue !== null) {
      applyChanges({
        prev: prevValue,
        next: nextValue,
        applyTo: applyTo[key] ?? {},
      });
      continue;
    }
    if (prevValue !== nextValue) {
      if (nextValue === undefined) {
        delete applyTo[key];
      } else if (current && typeof current === 'object' && typeof nextValue === 'object' && nextValue !== null) {
        applyChanges({
          prev: prevValue,
          next: nextValue,
          applyTo: applyTo[key],
        });
      } else {
        applyTo[key] = nextValue;
      }
    }
  }
}
