import React from 'react';

import { PencilIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { translationKey } from 'src/AppComponentsBridge';
import classes from 'src/layout/Summary/EditButton.module.css';

export interface IEditButtonProps {
  onClick: () => void;
  editText: string | null;
  label: string;
}

export function EditButton(props: IEditButtonProps) {
  return (
    <Button
      className={classes.editButton}
      variant='tertiary'
      color='second'
      onClick={props.onClick}
      aria-label={translationKey(`${props.editText}: ${props.label}`)}
    >
      {props.editText}
      <PencilIcon
        fontSize='1rem'
        aria-hidden={true}
      />
    </Button>
  );
}
