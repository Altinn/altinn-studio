import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { OpenDevToolsButton } from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton';
import { DevToolsPanel } from 'src/features/devtools/DevToolsPanel';

const localEnv = window.location.hostname === 'local.altinn.cloud';

interface IDevToolsProps {
  children: ReactNode;
}

export const DevTools = ({ children }: IDevToolsProps) => {
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(
    () =>
      window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setPanelOpen((open) => !open);
        }
      }),
    [],
  );

  return (
    <>
      {localEnv && (
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
