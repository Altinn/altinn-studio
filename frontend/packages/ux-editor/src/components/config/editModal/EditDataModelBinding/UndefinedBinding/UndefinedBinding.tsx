import React from 'react';
import { StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';

export type UndefinedBindingProps = {
  onClick: () => void;
  label: string;
};

export const UndefinedBinding = ({ onClick, label }: UndefinedBindingProps) => (
  <StudioProperty.Button icon={<LinkIcon />} onClick={onClick} property={label} />
);
