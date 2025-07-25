import React, { forwardRef, useId } from 'react';
import { Label, Search } from '@digdir/designsystemet-react';
import { WithoutAsChild } from '../../types/WithoutAsChild';
import { SearchProps } from '@digdir/designsystemet-react';
import classes from './StudioSearch.module.css';

export type StudioSearchProps = WithoutAsChild<SearchProps> & {
  label: React.ReactNode;
  id?: string;
  className?: string;
  value?: string;
  onClear?: () => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  ({ label, id, className, value, onClear, onChange, ...rest }, ref) => {
    const generatedId = useId();
    const searchId = id ?? generatedId;

    return (
      <div className={className}>
        <Label htmlFor={searchId}>{label}</Label>
        <Search className={classes.studioSearch}>
          <Search.Input ref={ref} id={searchId} value={value} onChange={onChange} {...rest} />
          <Search.Clear onClick={onClear} />
        </Search>
      </div>
    );
  },
);

StudioSearch.displayName = 'StudioSearch';
