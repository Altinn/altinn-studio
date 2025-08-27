import React from 'react';
import type { ReactElement } from 'react';
import { useStudioRadioGroup, StudioRadioGroup } from '@studio/components';
import type { StatusOption } from 'app-shared/types/AppConfig';
import { useTranslation } from 'react-i18next';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { LabelAndValue } from '../../../../../../types/LabelAndValue';
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
    <StudioRadioGroup
      id={id}
      legend={t('app_settings.about_tab_status_field_label')}
      required
      tagText={t('general.required')}
    >
      {options.map((option: LabelAndValue) => (
        <StudioRadioGroup.Item
          key={option.value}
          label={option.label}
          getRadioProps={getRadioProps({ value: option.value })}
          error={errors.length}
          hasError={errors.length > 0}
        />
      ))}
      {errors.length > 0 && (
        <StudioRadioGroup.Error validationMessageProps={validationMessageProps} />
      )}
    </StudioRadioGroup>
  );
}
