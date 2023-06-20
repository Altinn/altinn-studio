import React from 'react';

import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useLanguage } from 'src/hooks/useLanguage';
import type { ValidLanguageKey } from 'src/hooks/useLanguage';
import type { ILabelSettings } from 'src/types';

interface IAddressLabel {
  labelKey: ValidLanguageKey;
  id: string;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
}

export const AddressLabel = ({ labelKey, id, required, readOnly, labelSettings }: IAddressLabel) => {
  const { lang } = useLanguage();
  return (
    <label
      className='a-form-label title-label'
      htmlFor={id}
    >
      {lang(labelKey)}
      <RequiredIndicator
        required={required}
        readOnly={readOnly}
      />
      <OptionalIndicator
        labelSettings={labelSettings}
        readOnly={readOnly}
        required={required}
      />
    </label>
  );
};
