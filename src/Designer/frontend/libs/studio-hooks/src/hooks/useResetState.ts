import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

/**
 * Like `useState`, but resets the state to `initialValue` whenever `resetKey` changes.
 *
 * Prefer this hook over `useEffect` for resetting state, to avoid an additional rerender.
 */
export function useResetState<T>(
  initialValue: T,
  resetKey: unknown,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const [previousKey, setPreviousKey] = useState(resetKey);

  if (resetKey !== previousKey) {
    setPreviousKey(resetKey);
    setState(initialValue);
  }

  return [state, setState];
}
