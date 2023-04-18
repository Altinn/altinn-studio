import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Edit } from '@navikt/ds-icons';

export interface IEditButtonProps {
  onClick: () => void;
  editText: string | null;
  label: React.ReactNode;
}

export function EditButton(props: IEditButtonProps) {
  return (
    <Button
      variant={ButtonVariant.Quiet}
      color={ButtonColor.Secondary}
      icon={<Edit aria-hidden={true} />}
      iconPlacement='right'
      onClick={props.onClick}
      aria-label={`${props.editText} ${props.label}`}
    >
      {props.editText}
    </Button>
  );
}
