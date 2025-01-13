import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ShowEmptyFieldSwitchProps = {
  onChange: (override: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const ShowEmptyFieldSwitch = ({ onChange, override }: ShowEmptyFieldSwitchProps) => {
  const { t } = useTranslation();
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedOverride = {
          ...override,
          hideEmptyFields: !event.target.checked,
          forceShow: event.target.checked,
        };
        onChange(updatedOverride);
      }}
      checked={!override.hideEmptyFields}
      value={'hideEmptyFields'}
    >
      {t('ux_editor.component_properties.summary.override.hide_empty_fields')}
    </StudioSwitch>
  );
};
