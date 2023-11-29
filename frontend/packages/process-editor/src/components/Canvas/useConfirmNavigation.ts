import { useCallback, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export const useConfirmNavigation = (hasUnsavedChanges: boolean, confirmationMessage: string) => {
  useBeforeUnload(
    useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = confirmationMessage;
        }
      },
      [confirmationMessage, hasUnsavedChanges],
    ),
    { capture: true },
  );

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
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
