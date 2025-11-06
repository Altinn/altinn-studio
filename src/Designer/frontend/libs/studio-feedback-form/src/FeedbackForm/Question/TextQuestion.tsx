import React, { type ChangeEvent } from 'react';
import type { QuestionsProps } from '../../types/QuestionsProps';
import { StudioTextarea } from '@studio/components';

export function TextQuestion({ id, label, value, onChange }: QuestionsProps): React.ReactElement {
  return (
    <StudioTextarea
      id={id}
      label={label}
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(id, e.target.value)}
    />
  );
}
