import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

/**
 * Like `useState`, but resets the state to `initialValue` whenever `resetKey` changes.
 *
 * Uses the "derive during render" pattern instead of `useEffect + setState`,
 * so the reset happens in the same render pass — no extra re-render or stale frame.
 *
 * @example
 * // Reset a boolean flag when the selected task changes:
 * const [isEditing, setIsEditing] = useResetState(false, taskId);
 *
 * @example
 * // Keep local state in sync with a prop, while still allowing local edits:
 * const [selectedValue, setSelectedValue] = useResetState(propValue, propValue);
 */
export function useResetState<T>(
  initialValue: T,
  resetKey: unknown,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const [previousKey, setPreviousKey] = useState(resetKey);

  if (!Object.is(previousKey, resetKey)) {
    setPreviousKey(resetKey);
    setState(initialValue);
  }

  return [state, setState];
}
