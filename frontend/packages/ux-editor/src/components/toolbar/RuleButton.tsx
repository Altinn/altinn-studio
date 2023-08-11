import React from 'react';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { CogIcon } from '@navikt/aksel-icons';

export interface IRuleButtonProps {
  onClick: () => void;
  text: string;
}

export default function RuleButton(props: IRuleButtonProps) {
  return (
    <Button icon={<CogIcon />} onClick={props.onClick} variant={ButtonVariant.Outline} size='small'>
      {props.text}
    </Button>
  );
}
