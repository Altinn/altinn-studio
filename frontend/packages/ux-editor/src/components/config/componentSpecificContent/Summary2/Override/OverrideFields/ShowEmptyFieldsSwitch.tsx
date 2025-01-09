import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ShowEmptyFieldSwitchProps = {
  onChange: (label: keyof Summary2OverrideConfig, value: string | boolean) => void;
  override: Summary2OverrideConfig;
};

export const ShowEmptyFieldSwitch = ({ onChange, override }: ShowEmptyFieldSwitchProps) => {
  const { t } = useTranslation();
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value as keyof Summary2OverrideConfig, !event.target.checked)
      }
      checked={!override.hideEmptyFields}
      value={'hideEmptyFields'}
    >
      {t('ux_editor.component_properties.summary.override.hide_empty_fields')}
    </StudioSwitch>
  );
};
