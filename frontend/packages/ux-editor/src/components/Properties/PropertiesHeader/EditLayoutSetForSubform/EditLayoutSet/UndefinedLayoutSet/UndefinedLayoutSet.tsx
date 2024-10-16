import React from 'react';
import { StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';

export type UndefinedLayoutSetProps = {
  onClick: () => void;
  label: string;
};

export const UndefinedLayoutSet = ({ onClick, label }: UndefinedLayoutSetProps) => (
  <StudioProperty.Button icon={<LinkIcon />} onClick={onClick} property={label} />
);
