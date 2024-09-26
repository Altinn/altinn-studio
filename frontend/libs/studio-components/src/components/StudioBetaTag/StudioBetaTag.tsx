import React from 'react';
import { StudioTag, type StudioTagProps } from '../StudioTag';

export type StudioBetaTagProps = Omit<StudioTagProps, 'color' | 'children'>;

export const StudioBetaTag = ({ size = 'sm', ...rest }: StudioBetaTagProps) => {
  return (
    <StudioTag color='info' size={size} {...rest}>
      Beta
    </StudioTag>
  );
};
