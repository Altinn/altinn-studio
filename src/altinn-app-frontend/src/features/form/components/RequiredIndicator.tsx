import * as React from 'react';

import { getLanguageFromKey } from 'altinn-shared/utils/language';
import type { ILanguage } from 'altinn-shared/types';

export interface IRequiredIndicatorProps {
  language: ILanguage;
  required?: boolean;
  readOnly?: boolean;
}

export const RequiredIndicator = ({ language, required, readOnly }: IRequiredIndicatorProps) => {
  if (required && !readOnly) {
    return <span>{` ${getLanguageFromKey('form_filler.required_label', language)}`}</span>;
  }
  return null;
};
