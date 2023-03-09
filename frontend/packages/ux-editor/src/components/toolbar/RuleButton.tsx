import React from 'react';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Settings } from '@navikt/ds-icons';

export interface IRuleButtonProps {
  onClick: () => void;
  text: string;
}

export default function RuleButton(props: IRuleButtonProps) {
  return (
    <Button icon={<Settings />} onClick={props.onClick} variant={ButtonVariant.Outline}>
      {props.text}
    </Button>
  );
}
