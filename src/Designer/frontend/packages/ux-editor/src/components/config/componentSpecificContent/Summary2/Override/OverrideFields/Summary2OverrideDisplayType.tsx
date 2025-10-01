import React from 'react';
import { StudioNativeSelect } from '@studio/components-legacy';
import type {
  Summary2OverrideConfig,
  OverrideDisplayType,
} from 'app-shared/types/ComponentSpecificConfig';
import { type CustomConfigType, useCustomConfigType } from '../hook/useCustomConfigType';
import { useTranslation } from 'react-i18next';
import { mapSelectedTypeToConfig } from '../utils';
import { StudioCard } from '@studio/components';

export type Summary2OverrideDisplayTypeProps = {
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
};

export const Summary2OverrideDisplayType = ({
  override,
  onChange,
}: Summary2OverrideDisplayTypeProps) => {
  const { t } = useTranslation();
  const { displayType, componentId } = override;
  const customConfigTypes: CustomConfigType[] = useCustomConfigType();

  const handleCustomTypeChange = (newDisplayType: OverrideDisplayType): void => {
    const summary2OverrideConfig = mapSelectedTypeToConfig({
      componentId,
      displayType: newDisplayType,
    });
    onChange(summary2OverrideConfig);
  };

  return (
    <StudioCard>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.summary.override.display_type')}
        value={displayType}
        onChange={(e) => handleCustomTypeChange(e.target.value as OverrideDisplayType)}
      >
        {customConfigTypes.map((type: CustomConfigType) => (
          <option key={type.label} value={type.value}>
            {type.label}
          </option>
        ))}
      </StudioNativeSelect>
    </StudioCard>
  );
};
