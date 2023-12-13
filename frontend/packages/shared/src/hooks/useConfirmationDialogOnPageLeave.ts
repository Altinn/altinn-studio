import { useCallback, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export const useConfirmationDialogOnPageLeave = (
  showConfirmationDialog: boolean,
  confirmationMessage: string,
) => {
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (showConfirmationDialog) {
          event.preventDefault();
          event.returnValue = confirmationMessage;
        }
      },
      [showConfirmationDialog, confirmationMessage],
    ),
    { capture: true },
  );

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return showConfirmationDialog && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(confirmationMessage)) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, confirmationMessage]);
};
