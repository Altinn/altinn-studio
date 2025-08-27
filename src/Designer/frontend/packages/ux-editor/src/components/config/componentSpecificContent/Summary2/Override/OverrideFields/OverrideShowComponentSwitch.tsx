import React from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';

type OverrideShowComponentSwitch = {
  onChange: (updatedOverride: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const OverrideShowComponentSwitch = ({
  onChange,
  override,
}: OverrideShowComponentSwitch) => {
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
