import React from 'react';
import type { ReactElement } from 'react';
import { StudioRadio, useStudioRadioGroup, StudioRadioGroup } from '@studio/components';
import type { StatusOption } from 'app-shared/types/AppConfig';
import { useTranslation } from 'react-i18next';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { LabelAndValue } from 'app-development/features/appSettings/types/LabelAndValue';
import { getStatusOptions } from '../../utils/appConfigStatusUtils';

export type StatusRadioGroupProps = {
  selectedStatus?: StatusOption;
  onChangeStatus: (value: StatusOption) => void;
  errors?: AppConfigFormError[];
  id: string;
};

export function StatusRadioGroup({
  selectedStatus,
  onChangeStatus,
  errors = [],
  id,
}: StatusRadioGroupProps): ReactElement {
  const { t } = useTranslation();

  const { getRadioProps, validationMessageProps } = useStudioRadioGroup({
    value: selectedStatus,
    onChange: onChangeStatus,
    error: errors.length > 0 ? t('app_settings.about_tab_status_field_error') : undefined,
    name: 'appConfigStatus',
  });

  const options: LabelAndValue[] = getStatusOptions(t);

  return (
    <StudioRadioGroup id={id}>
      <StudioRadioGroup.Heading
        label={t('app_settings.about_tab_status_field_label')}
        required
        tagText={t('general.required')}
      />
      {options.map((option: LabelAndValue) => (
        <StudioRadio
          key={option.value}
          label={option.label}
          {...getRadioProps({ value: option.value })}
        />
      ))}
      {errors.length > 0 && (
        <StudioRadioGroup.Error validationMessageProps={validationMessageProps} />
      )}
    </StudioRadioGroup>
  );
}
