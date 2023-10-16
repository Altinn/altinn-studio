import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Edit } from '@navikt/ds-icons';

export interface IEditButtonProps {
  onClick: () => void;
  editText: string | null;
  label: string;
}

export function EditButton(props: IEditButtonProps) {
  return (
    <Button
      variant='quiet'
      color='second'
      size='small'
      icon={<Edit aria-hidden={true} />}
      iconPlacement='right'
      onClick={props.onClick}
      aria-label={`${props.editText}: ${props.label}`}
    >
      {props.editText}
    </Button>
  );
}
