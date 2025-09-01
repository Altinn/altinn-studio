import React from 'react';
import type { ReactElement } from 'react';
import { useStudioCheckboxGroup, StudioCheckboxGroup } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { LabelAndValue } from 'app-development/features/appSettings/types/LabelAndValue';
import { getAvailableForTypeOptions } from '../../utils/appConfigAvailableForTypeUtils';
import type { AvailableForTypeOption } from 'app-shared/types/AppConfig';

export type AvailableForTypeCheckboxGroupProps = {
  initialValues?: AvailableForTypeOption[];
  onChangeAvailableForType: (value: AvailableForTypeOption[]) => void;
  errors?: AppConfigFormError[];
  id: string;
};

export function AvailableForTypeCheckboxGroup({
  initialValues = [],
  onChangeAvailableForType,
  errors = [],
  id,
}: AvailableForTypeCheckboxGroupProps): ReactElement {
  const { t } = useTranslation();

  const { getCheckboxProps, validationMessageProps } = useStudioCheckboxGroup({
    value: initialValues,
    onChange: onChangeAvailableForType,
    error: errors.length > 0 ? t('app_settings.about_tab_error_available_for_type') : undefined,
    name: 'appConfigAvailableForType',
  });

  const options: LabelAndValue[] = getAvailableForTypeOptions(t);

  return (
    <StudioCheckboxGroup
      id={id}
      legend={t('app_settings.about_tab_available_for_type_field_label')}
      description={t('app_settings.about_tab_available_for_type_field_description')}
      required
      tagText={t('general.required')}
    >
      {options.map((option: LabelAndValue) => (
        <StudioCheckboxGroup.Item
          key={option.value}
          label={option.label}
          getCheckboxProps={getCheckboxProps({ value: option.value })}
          hasError={errors.length > 0}
        />
      ))}
      {errors.length > 0 && (
        <StudioCheckboxGroup.Error validationMessageProps={validationMessageProps} />
      )}
    </StudioCheckboxGroup>
  );
}
