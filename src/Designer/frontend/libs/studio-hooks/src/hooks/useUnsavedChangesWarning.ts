import { useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean, message: string): void {
  useBeforeUnload(
    (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
      }
    },
    { capture: true },
  );

  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (confirm(message)) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);
}
