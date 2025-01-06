import React, { forwardRef } from 'react';
import { Label, Search, type SearchProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioFieldset } from '../StudioFieldset';

export type StudioSearchProps = WithoutAsChild<SearchProps> & { legend?: string };

const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ size = 'sm', label, legend, ...rest }, ref) => {
    const showLabel = !!label;
    return showLabel ? (
      <StudioFieldset legend={legend}>
        <Label>{label}</Label>
        <Search {...rest} size={size} ref={ref} />
      </StudioFieldset>
    ) : (
      <Search {...rest} size={size} ref={ref} />
    );
  },
);

StudioSearch.displayName = 'StudioSearch';

export { StudioSearch };
