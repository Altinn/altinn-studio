import classes from './UndefinedBinding.module.css';
import React from 'react';
import { StudioButton } from '@studio/components';
import { LinkIcon } from '@studio/icons';

export type UndefinedBindingProps = {
  onClick: () => void;
  label: string;
};

export const UndefinedBinding = ({ onClick, label }: UndefinedBindingProps) => (
  <StudioButton
    className={classes.undefinedBinding}
    onClick={onClick}
    variant='tertiary'
    size='small'
    fullWidth
    icon={<LinkIcon />}
  >
    {label}
  </StudioButton>
);
