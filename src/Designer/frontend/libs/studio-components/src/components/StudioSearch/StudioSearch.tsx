import React, { forwardRef, useId } from 'react';
import { Label, Search, type SearchInputProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioValidationMessage } from '../StudioValidationMessage';
import classes from './StudioSearch.module.css';

export type StudioSearchProps = WithoutAsChild<SearchInputProps> & {
  label: React.ReactNode;
  id?: string;
  value?: string;
  clearButtonLabel?: string;
  className?: string;
  error?: string | false;
  searchButtonLabel?: React.ReactNode;
  onSearchClick?: () => void;
};

export const StudioSearch = forwardRef<HTMLInputElement, StudioSearchProps>(
  (
    {
      label,
      id,
      value,
      clearButtonLabel,
      className,
      error,
      searchButtonLabel,
      onSearchClick,
      'data-size': dataSize = 'md',
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const searchId = id ?? generatedId;
    const errorId = `${searchId}-error`;
    const describedBy = [ariaDescribedBy, error && errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={className}>
        <Label className={classes.label} data-size={dataSize} htmlFor={searchId}>
          {label}
        </Label>
        <Search>
          <Search.Input
            ref={ref}
            id={searchId}
            value={value}
            data-size={dataSize}
            {...rest}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={describedBy}
          />
          <Search.Clear aria-label={clearButtonLabel} title={clearButtonLabel} />
          {onSearchClick && (
            <Search.Button data-size={dataSize} onClick={onSearchClick}>
              {searchButtonLabel}
            </Search.Button>
          )}
        </Search>
        {error && (
          <StudioValidationMessage className={classes.error} data-size={dataSize} id={errorId}>
            {error}
          </StudioValidationMessage>
        )}
      </div>
    );
  },
);

StudioSearch.displayName = 'StudioSearch';
