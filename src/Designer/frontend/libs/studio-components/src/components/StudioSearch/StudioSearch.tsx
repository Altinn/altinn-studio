import React, { forwardRef, useId } from 'react';
import { Label, Search, type SearchProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import classes from './StudioSearch.module.css';

export type StudioSearchProps = WithoutAsChild<SearchProps> & {
  label: React.ReactNode;
  id?: string;
  value?: string;
  clearButtonLabel?: string;
  className?: string;
};

export const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ label, id, value, clearButtonLabel, className, ...rest }, ref) => {
    const generatedId = useId();
    const searchId = id ?? generatedId;

    return (
      <div className={className}>
        <Label className={classes.label} data-size='md' htmlFor={searchId}>
          {label}
        </Label>
        <Search>
          <Search.Input ref={ref} id={searchId} value={value} {...rest} />
          <Search.Clear aria-label={clearButtonLabel} title={clearButtonLabel} />
        </Search>
      </div>
    );
  },
);

StudioSearch.displayName = 'StudioSearch';
