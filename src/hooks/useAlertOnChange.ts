import { useRef, useState } from 'react';

export type AlertOnChangeProps = {
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
  handleChange: (...args: any[]) => void;
  confirmChange: () => void;
  cancelChange: () => void;
};

/**
 * Hook used to suspend a change event until the user confirms or cancels the change
 * @param enabled - Whether the alert should be enabled, otherwise the change will be called immediately
 * @param onChange - The change handler
 * @param shouldAlert - Optional function to determine whether the alert should be shown based on the change event
 * @returns A new change handler, and the necessary props needed to control the DeleteWarningPopover
 * @see DeleteWarningPopover
 */
export function useAlertOnChange(
  enabled: boolean,
  onChange: (...args: any[]) => void,
  shouldAlert?: (...args: any[]) => boolean,
) {
  const [alertOpen, setAlertOpen] = useState(false);
  const argsRef = useRef<any[]>();

  function handleChange(...args: any[]) {
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
  }

  function confirmChange() {
    setAlertOpen(false);
    if (argsRef.current) {
      onChange(...argsRef.current);
    }
    argsRef.current = undefined;
  }

  function cancelChange() {
    argsRef.current = undefined;
    setAlertOpen(false);
  }

  // Prevent the alert from opening from the outside
  // In that case there will be no event to pass through
  // Also make sure if the alert is closed from the outside
  // that the args are cleared
  function _setAlertOpen(open: boolean) {
    if (!open) {
      argsRef.current = undefined;
      setAlertOpen(false);
    }
  }

  return {
    alertOpen,
    setAlertOpen: _setAlertOpen,
    handleChange,
    confirmChange,
    cancelChange,
  };
}
