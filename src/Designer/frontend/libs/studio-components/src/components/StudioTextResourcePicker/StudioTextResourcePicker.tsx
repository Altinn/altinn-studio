import type { ReactElement } from 'react';
import React, { useMemo, forwardRef } from 'react';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';
import { StudioSuggestion, type StudioSuggestionProps } from '../StudioSuggestion';
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
      defaultSelected,
      onSelectedChange,
      selected,
      ...rest
    },
    ref,
  ) => {
    const handleSelectedChange = (item: { value: string }): void =>
      onValueChange(item?.value || null);

    const selectedValues: string[] = useMemo(
      () => retrieveSelectedValues(textResources, value),
      [textResources, value],
    );

    const selectedItem = useMemo(() => {
      const id = selectedValues[0];
      return id
        ? {
            value: id,
            label: textResources.find((tr) => tr.id === id)?.value ?? id,
          }
        : undefined;
    }, [selectedValues, textResources]);

    return (
      <StudioSuggestion
        {...rest}
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
