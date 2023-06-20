import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import type { ILabelSettings } from 'src/types';

interface IOptionalIndicatorProps {
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const OptionalIndicator = (props: IOptionalIndicatorProps) => {
  const { langAsString } = useLanguage();
  const shouldShowOptionalMarking = props.labelSettings?.optionalIndicator && !props.required && !props.readOnly;
  if (shouldShowOptionalMarking) {
    return <span className='label-optional'>{` (${langAsString('general.optional')})`}</span>;
  }
  return null;
};
