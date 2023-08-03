import { useCallback, useState } from 'react';

/**
 * Hook used to force a rerender of a component. It works by updating the key whenever you call rerender().
 * @param baseKey - The base key to use.
 * @returns A tuple containing the key to set in the component's key prop, and the rerender function.
 */
export function useRerender(baseKey: string): [string, () => void] {
  const [number, setNumber] = useState(0);
  const rerender = useCallback(() => setNumber((k) => k + 1), []);
  return [`${baseKey}-${number}`, rerender];
}
