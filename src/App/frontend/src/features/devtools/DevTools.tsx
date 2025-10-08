import React, { useCallback, useEffect } from 'react';

import { OpenDevToolsButton } from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsPanel } from 'src/features/devtools/DevToolsPanel';
import { useLayoutValidation } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { isDev } from 'src/utils/isDev';

export const DevTools = () => {
  const panelOpen = useDevToolsStore((state) => state.isOpen);
  const { open: openPanel, close: closePanel } = useDevToolsStore((state) => state.actions);

  useLayoutValidation();

  const setPanelOpen = useCallback(
    (open: boolean) => {
      if (open) {
        openPanel();
      } else {
        closePanel();
      }
    },
    [closePanel, openPanel],
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
      {isDev() && (
        <OpenDevToolsButton
          isHidden={panelOpen}
          onClick={() => setPanelOpen(true)}
        />
      )}
      <DevToolsPanel
        isOpen={panelOpen}
        close={() => setPanelOpen(false)}
      />
    </>
  );
};
