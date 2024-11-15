import React, { type ChangeEvent } from 'react';
import type { QuestionsProps } from '../../types/QuestionsProps';
import { StudioTextfield } from '@studio/components';
import { useDebounce } from '@studio/hooks';

export function TextQuestion({ id, label, value, onChange }: QuestionsProps): React.ReactElement {
  const { debounce } = useDebounce({ debounceTimeInMs: 500 });
  const debouncedOnChange = (newValue: string) => debounce(() => onChange(id, newValue));
  return (
    <StudioTextfield
      id={id}
      label={label}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => debouncedOnChange(e.target.value)}
    />
  );
}
