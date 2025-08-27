import React, { forwardRef } from 'react';
import { Textfield } from '@digdir/designsystemet-react';
import { type SharedTextInputProps } from '../../types/SharedTextInputProps';
import { useTextInputProps } from '../../hooks/useTextInputProps';

export type StudioTextfieldProps = SharedTextInputProps<HTMLInputElement>;

/**
 * @deprecated use `StudioTextfield` from `@studio/components` instead
 */
const StudioTextfield = forwardRef<HTMLInputElement, StudioTextfieldProps>((props, ref) => {
  const textfieldProps = useTextInputProps<HTMLInputElement>(props);
  return <Textfield ref={ref} {...textfieldProps} />;
});

StudioTextfield.displayName = 'StudioTextfield';

export { StudioTextfield };
