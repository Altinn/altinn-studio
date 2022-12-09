import * as React from 'react';

import { getLanguageFromKey } from 'src/language/sharedLanguage';
import type { ILanguage } from 'src/types/shared';

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
