import React from 'react';
import type { ReactElement } from 'react';
import { StudioRadio, useStudioRadioGroup } from '@studio/components';
import type { StatusOption } from 'app-shared/types/AppConfig';
import { useTranslation } from 'react-i18next';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

export type StatusRadioGroupProps = {
  status?: StatusOption;
  onChangeStatus: (value: StatusOption) => void;
  errors?: AppConfigFormError[];
};

export function StatusRadioGroup({
  status,
  onChangeStatus,
  errors = [],
}: StatusRadioGroupProps): ReactElement {
  const { t } = useTranslation();

  const { getRadioProps } = useStudioRadioGroup({
    value: status,
    onChange: onChangeStatus,
  });

  return (
    <StudioRadio
      label={t('app_settings.about_tab_status_label')}
      required
      tagText={t('general.required')}
      error={errors}
      {...getRadioProps({ value: status })}
    />
  );
}
