import React, { forwardRef } from 'react';
import { Textarea, type TextareaProps } from '@digdir/design-system-react';
import { useTextInputProps } from '../../hooks/useTextInputProps';
import type { SharedTextInputProps } from '../../types/SharedTextInputProps';

export type StudioTextareaProps = SharedTextInputProps<HTMLTextAreaElement>;

const StudioTextarea = forwardRef<HTMLTextAreaElement, StudioTextareaProps>((props, ref) => {
  const textareaProps: TextareaProps = useTextInputProps<HTMLTextAreaElement>(props);
  return <Textarea ref={ref} {...textareaProps} />;
});

StudioTextarea.displayName = 'StudioTextarea';

export { StudioTextarea };
