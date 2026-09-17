import { useCallback } from 'react';
import type { RefCallback } from 'react';

// StudioIconTextfield exposes its container ref but does not forward autoFocus to its input.
// Keep this workaround in v9 so the frozen editor retains its existing behavior.
export const useFocusInput = (): RefCallback<HTMLDivElement> =>
  useCallback((container) => {
    container?.querySelector('input')?.focus();
  }, []);
