import React from 'react';

import { useLanguage } from 'src/features/language/useLanguage';
import { AltinnPalette } from 'src/theme/altinnAppTheme';

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
      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: AltinnPalette.grey }}>{` (${langAsString(
        'general.optional',
      )})`}</span>
    );
  }
  return null;
};
