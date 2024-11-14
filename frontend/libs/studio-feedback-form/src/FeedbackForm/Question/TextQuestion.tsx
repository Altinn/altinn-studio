import React from 'react';
import type { QuestionsProps } from '../../types/QuestionsProps';
import { StudioTextfield } from '@studio/components';

export function TextQuestion({ id, label, onChange }: QuestionsProps) {
  return <StudioTextfield id={id} label={label} onChange={(e) => onChange(id, e.target.value)} />;
}
