import React, { forwardRef } from 'react';
import type { TextareaProps } from '@digdir/designsystemet-react';
import { Textarea } from '@digdir/designsystemet-react';
import { useTextInputProps } from '../../hooks/useTextInputProps';
import type { SharedTextInputProps } from '../../types/SharedTextInputProps';

export type StudioTextareaProps = SharedTextInputProps<HTMLTextAreaElement>;

/**
 * @deprecated use `StudioTextarea` from `@studio/components` instead
 */
const StudioTextarea = forwardRef<HTMLTextAreaElement, StudioTextareaProps>((props, ref) => {
  const textareaProps: TextareaProps = useTextInputProps<HTMLTextAreaElement>(props);
  return <Textarea ref={ref} {...textareaProps} />;
});

StudioTextarea.displayName = 'StudioTextarea';

export { StudioTextarea };
