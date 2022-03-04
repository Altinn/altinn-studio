import * as React from 'react';

import type { ILanguage } from 'altinn-shared/types';
import type { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';

interface IAddressLabel {
  labelKey: string;
  id: string;
  language: ILanguage;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const AddressLabel = ({
  labelKey,
  id,
  language,
  required,
  readOnly,
  labelSettings,
}: IAddressLabel) => {
  const label = getLanguageFromKey(labelKey, language);
  return (
    <label className='a-form-label title-label' htmlFor={id}>
      {label}
      {required ||
      readOnly ||
      labelSettings?.optionalIndicator === false ? null : (
        <span className='label-optional'>
          {` (${getLanguageFromKey('general.optional', language)})`}
        </span>
      )}
    </label>
  );
};
