import React, { forwardRef, useId } from 'react';
import { Label, Search, type SearchProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioSearchProps = WithoutAsChild<SearchProps>;

const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ size = 'sm', label, id, className, ...rest }, ref) => {
    const generatedId = useId();
    const searchId = id ?? generatedId;
    const showLabel = !!label;

    return (
      <div className={className}>
        {showLabel && (
          <Label htmlFor={searchId} spacing>
            {label}
          </Label>
        )}
        <Search {...rest} id={searchId} size={size} ref={ref} />
      </div>
    );
  },
);

StudioSearch.displayName = 'StudioSearch';

export { StudioSearch };
