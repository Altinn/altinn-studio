import { useCallback, useState } from 'react';

/**
 * Utility hook for giving feedback to the user when a process takes time
 * @see NavigationButtonsComponent
 */
export function useIsProcessing<T extends string>() {
  const [isProcessing, setIsProcessing] = useState<T | null>(null);
  const processing = useCallback(
    async (key: T, callback: () => Promise<void>) => {
      if (isProcessing) {
        return;
      }
      try {
        setIsProcessing(key);
        await callback();
      } finally {
        setIsProcessing(null);
      }
    },
    [isProcessing],
  );

  return [isProcessing, processing] as const;
}
