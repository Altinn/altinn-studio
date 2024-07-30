import type { ChangeEvent } from 'react';
import React from 'react';
import { StudioTextfield } from '@studio/components';

export interface ImageFromUrlProps {
  existingImageUrl: string;
  onUrlChange: (url: string) => void;
  onUrlDelete: () => void;
}

export const ImageFromUrl = ({ onUrlChange, existingImageUrl, onUrlDelete }: ImageFromUrlProps) => {
  const handleBlur = (url: string) => {
    if (url === '') onUrlDelete();
    else onUrlChange(url);
  };
  return (
    <StudioTextfield
      size='small'
      label={'Lim inn bildeadressen (URL)'}
      value={existingImageUrl}
      onBlur={({ target }: ChangeEvent<HTMLInputElement>) => handleBlur(target.value)}
    />
  );
};
