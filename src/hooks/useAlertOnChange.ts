import { useCallback, useRef, useState } from 'react';

type ChangeFn = (...args: any[]) => any;
export interface AlertOnChange<Fn extends ChangeFn> {
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
  handleChange: Fn;
  confirmChange: () => void;
  cancelChange: () => void;
}

/**
 * Hook used to suspend a change event until the user confirms or cancels the change
 * @param enabled - Whether the alert should be enabled, otherwise the change will be called immediately
 * @param onChange - The change handler
 * @param shouldAlert - Optional function to determine whether the alert should be shown based on the change event
 * @returns A new change handler, and the necessary props needed to control the DeleteWarningPopover
 * @see DeleteWarningPopover
 */
export function useAlertOnChange<Fn extends ChangeFn>(
  enabled: boolean,
  onChange: Fn,
  shouldAlert?: (...args: Parameters<Fn>) => boolean,
): AlertOnChange<Fn> {
  const [alertOpen, setAlertOpen] = useState(false);
  const argsRef = useRef<any[]>();

  const handleChange = useCallback(
    (...args: Parameters<Fn>) => {
      if (enabled && (!shouldAlert || shouldAlert(...args))) {
        // If standard event we need to prevent default
        const event = args?.[0] instanceof Event ? args[0] : undefined;
        if (event) {
          event.preventDefault();
        }
        argsRef.current = args;
        setAlertOpen(true);
      } else {
        onChange(...args);
      }
    },
    [enabled, onChange, shouldAlert],
  ) as Fn;

  const confirmChange = useCallback(() => {
    setAlertOpen(false);
    if (argsRef.current) {
      onChange(...argsRef.current);
    }
    argsRef.current = undefined;
  }, [onChange]);

  const cancelChange = useCallback(() => {
    argsRef.current = undefined;
    setAlertOpen(false);
  }, []);

  // Prevent the alert from opening from the outside
  // In that case there will be no event to pass through
  // Also make sure if the alert is closed from the outside
  // that the args are cleared
  const _setAlertOpen = useCallback((open: boolean) => {
    if (!open) {
      argsRef.current = undefined;
      setAlertOpen(false);
    }
  }, []);

  return {
    alertOpen,
    setAlertOpen: _setAlertOpen,
    handleChange,
    confirmChange,
    cancelChange,
  };
}
