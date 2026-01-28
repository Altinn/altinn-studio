import type { ReactElement } from 'react';
import React, { useMemo, forwardRef } from 'react';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';
import {
  StudioSuggestion,
  type StudioSuggestionProps,
  type StudioSuggestionItem,
} from '../StudioSuggestion';
import type { Override } from '../../types/Override';
import classes from './StudioTextResourcePicker.module.css';
import { retrieveSelectedValues } from './utils';

export type StudioTextResourcePickerProps = Override<
  {
    emptyLabel?: string;
    noTextResourceOptionLabel?: string;
    onValueChange: (id: string | null) => void;
    required?: boolean;
    textResources: TextResource[];
    value?: string;
  },
  StudioSuggestionProps
>;

export const StudioTextResourcePicker = forwardRef<HTMLInputElement, StudioTextResourcePickerProps>(
  (
    {
      emptyLabel = '',
      noTextResourceOptionLabel = '',
      onValueChange,
      required,
      textResources,
      value,
      ...rest
    },
    ref,
  ) => {
    const handleSelectedChange = (item: StudioSuggestionItem): void => onValueChange(item.value);

    const selectedValue: string = useMemo(
      () => retrieveSelectedValues(textResources, value)[0] || '',
      [textResources, value],
    );

    const selectedItem: StudioSuggestionItem = useMemo(
      () => ({
        value: selectedValue,
        label: textResources.find((tr) => tr.id === selectedValue)?.value ?? selectedValue,
      }),
      [selectedValue, textResources],
    );

    return (
      <StudioSuggestion
        {...rest}
        defaultSelected={selectedItem}
        multiple={false}
        onSelectedChange={handleSelectedChange}
        selected={selectedItem}
        ref={ref}
      >
        {!required && renderNoTextResourceOption(noTextResourceOptionLabel)}
        {renderTextResourceOptions(textResources)}
      </StudioSuggestion>
    );
  },
);

function renderNoTextResourceOption(label: string): ReactElement {
  return (
    <StudioSuggestion.Option aria-label={label} className={classes.noTextResourceOption} value='' />
  );
}

function renderTextResourceOptions(textResources: TextResource[]): ReactElement[] {
  return textResources.map(renderTextResourceOption);
}

function renderTextResourceOption(textResource: TextResource): ReactElement {
  return (
    <StudioSuggestion.Option key={textResource.id} value={textResource.id}>
      <div>
        <div>{textResource.value}</div>
        <div className={classes.optionDescription}>{textResource.id}</div>
      </div>
    </StudioSuggestion.Option>
  );
}

StudioTextResourcePicker.displayName = 'StudioTextResourcePicker';
