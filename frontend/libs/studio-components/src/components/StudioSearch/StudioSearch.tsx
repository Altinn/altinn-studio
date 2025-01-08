import React, { forwardRef, useId } from 'react';
import { Label, Search, type SearchProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioSearchProps = WithoutAsChild<SearchProps>;

const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ size = 'sm', label, id, ...rest }, ref) => {
    const generatedId = useId();
    const searchId = id ?? generatedId;
    const showLabel = !!label;

    return showLabel ? (
      <>
        <Label htmlFor={searchId}>{label}</Label>
        <Search {...rest} id={searchId} size={size} ref={ref} />
      </>
    ) : (
      <Search {...rest} size={size} ref={ref} />
    );
  },
);

StudioSearch.displayName = 'StudioSearch';

export { StudioSearch };
