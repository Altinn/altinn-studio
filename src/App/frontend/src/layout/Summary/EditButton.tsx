import React from 'react';

import { Button } from '@app/form-component';
import { PencilIcon } from '@navikt/aksel-icons';

import classes from 'src/layout/Summary/EditButton.module.css';
import { scrollSummaryIntoView } from 'src/layout/Summary/scrollSummaryIntoView';

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
      onFocus={scrollSummaryIntoView}
      aria-label={props.editText ? `${props.editText}: ${props.label}` : props.label}
    >
      {props.editText}
      <PencilIcon
        fontSize='1rem'
        aria-hidden={true}
      />
    </Button>
  );
}
