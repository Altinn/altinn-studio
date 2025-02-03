import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ForceShowSwitchProps = {
  onChange: (override: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const ForceShowSwitch = ({ onChange, override }: ForceShowSwitchProps) => {
  const { t } = useTranslation();
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedOverride = {
          ...override,
          forceShow: event.target.checked,
        };
        onChange(updatedOverride);
      }}
      checked={override.forceShow}
    >
      {t('ux_editor.component_properties.summary.override.force_show')}
    </StudioSwitch>
  );
};
