import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import type { ILabelSettings } from 'src/layout/common.generated';

interface IOptionalIndicatorProps {
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const OptionalIndicator = (props: IOptionalIndicatorProps) => {
  const { langAsString } = useLanguage();
  const shouldShowOptionalMarking = props.labelSettings?.optionalIndicator && !props.required && !props.readOnly;
  if (shouldShowOptionalMarking) {
    return (
      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6a6a6a' }}>{` (${langAsString(
        'general.optional',
      )})`}</span>
    );
  }
  return null;
};
