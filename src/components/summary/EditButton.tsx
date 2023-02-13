import * as React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Edit } from '@navikt/ds-icons';

export interface IEditButtonProps {
  onClick: () => void;
  editText: string | null;
}

export function EditButton(props: IEditButtonProps) {
  return (
    <Button
      variant={ButtonVariant.Quiet}
      color={ButtonColor.Secondary}
      icon={<Edit aria-hidden={true} />}
      iconPlacement='right'
      onClick={props.onClick}
    >
      {props.editText}
    </Button>
  );
}
