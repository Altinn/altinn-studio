import React from 'react';
import { useDispatch } from 'react-redux';

import { Button } from '@digdir/design-system-react';
import { CodeIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton.module.css';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { useAppSelector } from 'src/hooks/useAppSelector';

interface IOpenDevToolsButtonProps {
  isHidden: boolean;
  onClick: () => void;
}

export const OpenDevToolsButton = ({ isHidden, onClick }: IOpenDevToolsButtonProps) => {
  const logs = useAppSelector((state) => state.devTools.logs);
  const dispatch = useDispatch();

  const hasErrors = logs.some((log) => log.level === 'error');

  const onErrorClick = () => {
    dispatch(DevToolsActions.open());
    dispatch(DevToolsActions.setActiveTab({ tabName: DevToolsTab.Logs }));
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
          size='small'
          variant='outline'
          color='second'
          onClick={onClick}
          aria-label='åpne utviklerverkøy'
          icon={<CodeIcon aria-hidden />}
        />
      </div>
    </div>
  );
};
