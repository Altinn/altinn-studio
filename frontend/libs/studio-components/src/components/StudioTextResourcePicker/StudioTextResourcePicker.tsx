import type { ReactElement } from 'react';
import React, { useMemo, forwardRef, useCallback } from 'react';
import type { TextResource } from '../../types/TextResource';
import type { StudioComboboxProps } from '../StudioCombobox';
import { StudioCombobox } from '../StudioCombobox';
import type { Override } from '../../types/Override';
import classes from './StudioTextResourcePicker.module.css';
import { retrieveSelectedValues } from './utils';

export type StudioTextResourcePickerProps = Override<
  {
    onValueChange: (id: string | null) => void;
    textResources: TextResource[];
    noTextResourceOptionLabel: string;
    value?: string;
  },
  StudioComboboxProps
>;

export const StudioTextResourcePicker = forwardRef<HTMLInputElement, StudioTextResourcePickerProps>(
  ({ textResources, onSelect, onValueChange, noTextResourceOptionLabel, value, ...rest }, ref) => {
    const handleValueChange = useCallback(
      ([id]: string[]) => onValueChange(id || null),
      [onValueChange],
    );

    const selectedValues: string[] = useMemo(
      () => retrieveSelectedValues(textResources, value),
      [textResources, value],
    );

    return (
      <StudioCombobox
        hideLabel
        onValueChange={handleValueChange}
        value={selectedValues}
        {...rest}
        ref={ref}
      >
        {renderNoTextResourceOption(noTextResourceOptionLabel)}
        {renderTextResourceOptions(textResources)}
      </StudioCombobox>
    );
  },
);

function renderNoTextResourceOption(label: string): ReactElement {
  // This cannot be a component function since the option component must be a direct child of the combobox component.
  return (
    <StudioCombobox.Option
      aria-label={label}
      className={classes.noTextResourceOption}
      description={label}
      value=''
    />
  );
}

function renderTextResourceOptions(textResources: TextResource[]): ReactElement[] {
  // This cannot be a component function since the option components must be direct children of the combobox component.
  return textResources.map(renderTextResourceOption);
}

function renderTextResourceOption(textResource: TextResource): ReactElement {
  return (
    <StudioCombobox.Option
      description={textResource.id}
      key={textResource.id}
      value={textResource.id}
    >
      {textResource.value}
    </StudioCombobox.Option>
  );
}

StudioTextResourcePicker.displayName = 'StudioTextResourcePicker';
