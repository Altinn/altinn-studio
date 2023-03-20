import React from 'react';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { SaveFile } from '@navikt/ds-icons';
import classes from './VersionControlHeader.module.css';

export interface ICloneButtonProps {
  onClick: (event: React.MouseEvent) => void;
  buttonText: string;
}

export function CloneButton(props: ICloneButtonProps) {
  return (
    <Button
      className={classes.button}
      icon={<SaveFile />}
      onClick={props.onClick}
      size={ButtonSize.Small}
      variant={ButtonVariant.Quiet}
    >
      {props.buttonText}
    </Button>
  );
}
