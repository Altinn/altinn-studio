import { useCallback } from 'react';
import type { RefCallback } from 'react';

// StudioToggleableTextfield passes autoFocus to StudioIconTextfield, which exposes its container
// ref but does not forward autoFocus to its input, so the input is focused through the container.
export const useFocusInput = (): RefCallback<HTMLDivElement> =>
  useCallback((container) => {
    container?.querySelector('input')?.focus();
  }, []);
