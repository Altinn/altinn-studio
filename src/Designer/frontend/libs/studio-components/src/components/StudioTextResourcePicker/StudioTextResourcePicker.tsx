import type { ReactElement } from 'react';
import { useMemo, forwardRef } from 'react';
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
    onValueChange: (id: string | null) => void;
    required?: boolean;
    textResources: TextResource[];
    value?: string;
  },
  StudioSuggestionProps
>;

export const StudioTextResourcePicker = forwardRef<HTMLInputElement, StudioTextResourcePickerProps>(
  ({ onValueChange, textResources, value, ...rest }, ref) => {
    const handleSelectedChange = (item: StudioSuggestionItem): void =>
      onValueChange(item?.value ?? null);

    const selectedValue: string = useMemo(
      () => retrieveSelectedValues(textResources, value)[0] || '',
      [textResources, value],
    );

    const selectedItem: StudioSuggestionItem | null = useMemo(
      () =>
        selectedValue
          ? {
              value: selectedValue,
              label: textResources.find((tr) => tr.id === selectedValue)?.value ?? selectedValue,
            }
          : null,
      [selectedValue, textResources],
    );

    return (
      <StudioSuggestion
        {...rest}
        defaultSelected={undefined}
        multiple={false}
        onSelectedChange={handleSelectedChange}
        selected={selectedItem}
        ref={ref}
      >
        {renderTextResourceOptions(textResources)}
      </StudioSuggestion>
    );
  },
);

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
