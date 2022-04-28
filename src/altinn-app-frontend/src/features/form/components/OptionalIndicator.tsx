import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils/language';
import { useAppSelector } from 'src/common/hooks';

export const OptionalIndicator = () => {
  const language = useAppSelector(state => state.language.language);
  return (
    <span className='label-optional'>
      {` (${getLanguageFromKey('general.optional', language)})`}
    </span>
  )
}
