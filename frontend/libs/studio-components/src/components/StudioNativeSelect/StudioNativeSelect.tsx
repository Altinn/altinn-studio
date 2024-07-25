import React, { forwardRef, useId } from 'react';
import classes from './StudioNativeSelect.module.css';
import {
  Label,
  Paragraph,
  NativeSelect,
  type NativeSelectProps,
} from '@digdir/designsystemet-react';

export type StudioNativeSelectProps = {
  description?: string;
} & Omit<NativeSelectProps, 'hideLabel'>;

//TODO - Add label and description to NativeSelect when this issue is solved in the design system: https://github.com/Altinn/altinn-studio/issues/12725
export const StudioNativeSelect = forwardRef<HTMLSelectElement, StudioNativeSelectProps>(
  ({ children, description, label, id, size, ...rest }, ref): React.JSX.Element => {
    const defaultId = useId();
    id = id ?? defaultId;
    return (
      <div className={classes.wrapper}>
        {label && (
          <Label size={size} spacing htmlFor={id}>
            {label}
          </Label>
        )}
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
          hideLabel
          size={size}
          id={id}
          aria-describedby={description && 'studio-native-select-description'}
          {...rest}
        >
          {children}
        </NativeSelect>
      </div>
    );
  },
);

StudioNativeSelect.displayName = 'StudioNativeSelect';
