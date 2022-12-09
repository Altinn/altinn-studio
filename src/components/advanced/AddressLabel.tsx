import * as React from 'react';

import { OptionalIndicator } from 'src/features/form/components/OptionalIndicator';
import { RequiredIndicator } from 'src/features/form/components/RequiredIndicator';
import type { ILabelSettings } from 'src/types';

import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { ILanguage } from 'src/types/shared';

interface IAddressLabel {
  labelKey: string;
  id: string;
  language: ILanguage;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const AddressLabel = ({ labelKey, id, language, required, readOnly, labelSettings }: IAddressLabel) => {
  const label = getLanguageFromKey(labelKey, language);
  return (
    <label
      className='a-form-label title-label'
      htmlFor={id}
    >
      {label}
      <RequiredIndicator
        required={required}
        readOnly={readOnly}
        language={language}
      />
      <OptionalIndicator
        labelSettings={labelSettings}
        language={language}
        readOnly={readOnly}
        required={required}
      />
    </label>
  );
};
