import React from 'react';
import { StudioButton } from '@studio/components-legacy';
import { CogIcon } from 'libs/studio-icons/src';

export interface IRuleButtonProps {
  onClick: () => void;
  text: string;
}

export default function RuleButton(props: IRuleButtonProps) {
  return (
    <StudioButton icon={<CogIcon />} onClick={props.onClick} variant='secondary'>
      {props.text}
    </StudioButton>
  );
}
