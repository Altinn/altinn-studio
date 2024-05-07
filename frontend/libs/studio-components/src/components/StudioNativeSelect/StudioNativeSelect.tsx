import React, { forwardRef } from 'react';
import classes from './studioNativeSelect.module.css';
import {
  Label,
  Paragraph,
  NativeSelect,
  type NativeSelectProps,
} from '@digdir/design-system-react';

export type SelectOption = {
  value: string;
  label: string;
};

export type StudioNativeSelectProps = {
  options: SelectOption[];
  description?: string;
} & Omit<NativeSelectProps, 'hideLabel'>;

//TODO - Add label and description to NativeSelect when this issue is solved in the design system: https://github.com/Altinn/altinn-studio/issues/12725
export const StudioNativeSelect = forwardRef<HTMLSelectElement, StudioNativeSelectProps>(
  ({ options, description, label, id, size, ...rest }, ref): React.JSX.Element => {
    return (
      <>
        <Label size={size} spacing htmlFor={id}>
          {label}
        </Label>
        {description && (
          <Paragraph
            className={classes.studioNativeSelectDescription}
            size={size}
            id='studio-native-select-description'
          >
            {description}
          </Paragraph>
        )}
        <NativeSelect
          ref={ref}
          label={label}
          hideLabel
          size={size}
          id={id}
          aria-describedby={description && 'studio-native-select-description'}
          {...rest}
        >
          <StudioNativeSelectOptions options={options} />
        </NativeSelect>
      </>
    );
  },
);

StudioNativeSelect.displayName = 'StudioNativeSelect';

type StudioNativeSelectOptionsProps = {
  options: SelectOption[];
};
const StudioNativeSelectOptions = ({
  options,
}: StudioNativeSelectOptionsProps): React.JSX.Element[] => {
  return options.map(({ value, label }: SelectOption) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
};
