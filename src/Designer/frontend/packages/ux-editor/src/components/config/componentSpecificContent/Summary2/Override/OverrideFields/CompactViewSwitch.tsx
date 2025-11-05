import React, { type ChangeEvent } from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';

type CompactViewSwitchProps = {
  onChange: (updatedOverride: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const Summary2OverrideCompactSwitch = ({ onChange, override }: CompactViewSwitchProps) => {
  const { t } = useTranslation();

  return (
    <StudioSwitch
      position='end'
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange({ ...override, isCompact: event.target.checked })
      }
      checked={override.isCompact ?? false}
      value='isCompact'
      label={t('ux_editor.component_properties.summary.override.is_compact')}
    />
  );
};
