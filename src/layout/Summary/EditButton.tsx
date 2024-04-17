import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Edit } from '@navikt/ds-icons';

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
      size='small'
      onClick={props.onClick}
      aria-label={`${props.editText}: ${props.label}`}
    >
      {props.editText}
      <Edit
        fontSize='1rem'
        aria-hidden={true}
      />
    </Button>
  );
}
