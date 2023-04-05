import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { CodeIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/OpenDevToolsButton/OpenDevToolsButton.module.css';

interface IOpenDevToolsButtonProps {
  isHidden: boolean;
  onClick: () => void;
}

export const OpenDevToolsButton = ({ isHidden, onClick }: IOpenDevToolsButtonProps) => (
  <div className={cn(classes.devToolsButton, { [classes.hidden]: isHidden })}>
    <div className={classes.message}>
      <p>
        Du kan åpne utviklerverktøyet ved å trykke på knappen til høyre eller ved å bruke hurtigtasten{' '}
        <span className={classes.highlight}>Ctrl+Shift+K</span> / <span className={classes.highlight}>⌘+Shift+K</span>.
      </p>
      <p style={{ marginBottom: 0 }}>
        I test- og produksjonsmiljøene er verktøyet kun tilgjengelig gjennom hurtigtasten.
      </p>
    </div>

    <Button
      tabIndex={-1}
      variant={ButtonVariant.Outline}
      color={ButtonColor.Secondary}
      onClick={onClick}
      aria-label='åpne utviklerverkøy'
      icon={<CodeIcon aria-hidden />}
    />
  </div>
);
