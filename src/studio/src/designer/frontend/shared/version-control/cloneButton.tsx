import React from 'react';
import { Button, ButtonSize, ButtonVariant } from '@altinn/altinn-design-system';
import { SaveFile } from '@navikt/ds-icons';
import classes from './versionControlHeader.module.css';

export interface ICloneButtonProps {
  onClick: (event: React.MouseEvent) => void;
  buttonText: string;
}

export function CloneButton(props: ICloneButtonProps) {
  return (
    <Button
      onClick={props.onClick}
      variant={ButtonVariant.Quiet}
      size={ButtonSize.Small}
      className={classes.button}
      svgIconComponent={<SaveFile />}
    >
      {props.buttonText}
    </Button>
  );
}
