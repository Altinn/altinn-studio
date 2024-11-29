import React from 'react';

import { CodeIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton.module.css';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';

interface IOpenDevToolsButtonProps {
  isHidden: boolean;
  onClick: () => void;
}

export const OpenDevToolsButton = ({ isHidden, onClick }: IOpenDevToolsButtonProps) => {
  const logs = useDevToolsStore((state) => state.logs);
  const open = useDevToolsStore((state) => state.actions.open);
  const setActiveTab = useDevToolsStore((state) => state.actions.setActiveTab);

  const hasErrors = logs.some((log) => log.level === 'error');

  const onErrorClick = () => {
    open();
    setActiveTab(DevToolsTab.Logs);
  };

  return (
    <div className={cn(classes.devToolsButton, { [classes.hidden]: isHidden })}>
      <div className={classes.message}>
        <p>
          Du kan åpne utviklerverktøyet ved å trykke på knappen til høyre eller ved å bruke hurtigtasten{' '}
          <span className={classes.highlight}>Ctrl+Shift+K</span> / <span className={classes.highlight}>⌘+Shift+K</span>
          .
        </p>
        <p style={{ marginBottom: 0 }}>
          I produksjonsmiljøet er knappen skjult og verktøyet er kun tilgjengelig gjennom hurtigtasten.
        </p>
      </div>

      <div className={classes.button}>
        {hasErrors && (
          <XMarkOctagonFillIcon
            role='button'
            onClick={onErrorClick}
            className={classes.errorIcon}
            title='developer tools error'
          />
        )}
        <Button
          tabIndex={-1}
          variant='secondary'
          color='second'
          onClick={onClick}
          aria-label='åpne utviklerverkøy'
          icon={true}
        >
          <CodeIcon
            fontSize='1rem'
            aria-hidden
          />
        </Button>
      </div>
    </div>
  );
};
