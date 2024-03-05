import React from 'react';
import { StudioPropertyButton } from '@studio/components';
import { LinkIcon } from '@studio/icons';

export type UndefinedBindingProps = {
  onClick: () => void;
  label: string;
};

export const UndefinedBinding = ({ onClick, label }: UndefinedBindingProps) => (
  <StudioPropertyButton icon={<LinkIcon />} onClick={onClick} property={label} />
);
