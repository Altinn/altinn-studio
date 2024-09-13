import React from 'react';
import { StudioButton } from '@studio/components';
import classes from './StudioReferenceButton.module.css';
import type { ReferenceNode } from '../../../../../packages/schema-model';

export interface StudioReferenceButtonProps {
  name: string;
  onClick: () => void;
  node: ReferenceNode;
}

export const StudioReferenceButton = ({ name, onClick, node }: StudioReferenceButtonProps) => {
  return (
    <StudioButton className={classes.root} color='second' onClick={onClick} variant='secondary'>
      {name}
    </StudioButton>
  );
};
