import React, { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import { OpenDevToolsButton } from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsPanel } from 'src/features/devtools/DevToolsPanel';
import { useLayoutValidation } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useIsDev } from 'src/hooks/useIsDev';

interface IDevToolsProps {
  children: ReactNode;
}

export const DevTools = ({ children }: IDevToolsProps) => {
  const isDev = useIsDev();
  const panelOpen = useAppSelector((state) => state.devTools.isOpen);
  const dispatch = useAppDispatch();

  useLayoutValidation();

  const setPanelOpen = useCallback(
    (open: boolean) => {
      if (open) {
        dispatch(DevToolsActions.open());
      } else {
        dispatch(DevToolsActions.close());
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPanelOpen(!panelOpen);
      }
    };

    window.addEventListener('keydown', listener);

    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [panelOpen, setPanelOpen]);

  return (
    <>
      {isDev && (
        <OpenDevToolsButton
          isHidden={panelOpen}
          onClick={() => setPanelOpen(true)}
        />
      )}
      <DevToolsPanel
        isOpen={panelOpen}
        close={() => setPanelOpen(false)}
      >
        {children}
      </DevToolsPanel>
    </>
  );
};
