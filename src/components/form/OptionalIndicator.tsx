import React from 'react';

import { useLanguage } from 'src/features/language/useLanguage';

export type OptionalIndicatorProps = {
  readOnly?: boolean;
  required?: boolean;
  showOptionalMarking?: boolean;
};

export const OptionalIndicator = ({ readOnly, required, showOptionalMarking }: OptionalIndicatorProps) => {
  const { langAsString } = useLanguage();
  const shouldShowOptionalMarking = !required && showOptionalMarking && !readOnly;
  if (shouldShowOptionalMarking) {
    return (
      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6a6a6a' }}>{` (${langAsString(
        'general.optional',
      )})`}</span>
    );
  }
  return null;
};
