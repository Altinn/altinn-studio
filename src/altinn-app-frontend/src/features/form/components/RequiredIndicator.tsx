import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import { useAppSelector } from 'src/common/hooks';

export const RequiredIndicator = () => {
  const language = useAppSelector(state => state.language.language);
  return (
    <span>
      {` ${getLanguageFromKey('form_filler.required_label', language)}`}
    </span>
  )
}
