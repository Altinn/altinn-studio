import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ForceShowSwitchProps = {
  onChange: (updatedOverride: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const OverrideShowComponentSwitch = ({ onChange, override }: ForceShowSwitchProps) => {
  const { t } = useTranslation();
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...override, hidden: !event.target.checked })
      }
      checked={!override.hidden}
      value={'hidden'}
    >
      {t('ux_editor.component_properties.summary.override.show_component')}
    </StudioSwitch>
  );
};
