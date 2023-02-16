import React from 'react';

import { getLanguageFromKey } from 'src/language/sharedLanguage';
import type { ILabelSettings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

interface IOptionalIndicatorProps {
  language: ILanguage;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const OptionalIndicator = (props: IOptionalIndicatorProps) => {
  const shouldShowOptionalMarking = props.labelSettings?.optionalIndicator && !props.required && !props.readOnly;
  if (shouldShowOptionalMarking) {
    return <span className='label-optional'>{` (${getLanguageFromKey('general.optional', props.language)})`}</span>;
  }
  return null;
};
