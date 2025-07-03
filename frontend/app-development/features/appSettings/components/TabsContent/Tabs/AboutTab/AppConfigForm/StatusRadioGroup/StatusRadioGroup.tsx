import React from 'react';
import type { ReactElement } from 'react';
import { StudioRadio, useStudioRadioGroup } from '@studio/components';
import type { StatusOption } from 'app-shared/types/AppConfig';
import { useTranslation } from 'react-i18next';

export type StatusRadioGroupProps = {
  status?: StatusOption;
  onChangeStatus: (value: StatusOption) => void;
};

export function StatusRadioGroup({ status, onChangeStatus }: StatusRadioGroupProps): ReactElement {
  const { t } = useTranslation();

  const { getRadioProps } = useStudioRadioGroup({
    value: status,
    onChange: onChangeStatus,
  });

  return (
    <StudioRadio
      label={t('ux_editor.page_group.select_data_type')}
      {...getRadioProps({ value: status })}
    />
  );
}
