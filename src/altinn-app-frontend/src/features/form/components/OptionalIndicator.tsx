import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import type { ILanguage } from 'altinn-shared/types';
import type { ILabelSettings } from 'src/types';

interface IOptionalIndicatorProps {
  language: ILanguage;
  required: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const OptionalIndicator = (props: IOptionalIndicatorProps) => {
  const shouldShowOptionalMarking =
    props.labelSettings?.optionalIndicator &&
    !props.required &&
    !props.readOnly;
  if (shouldShowOptionalMarking) {
    return (
      <span className='label-optional'>
        {` (${getLanguageFromKey('general.optional', props.language)})`}
      </span>
    );
  }
  return null;
};
