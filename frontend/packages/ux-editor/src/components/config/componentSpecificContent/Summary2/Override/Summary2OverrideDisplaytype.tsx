import React, { useEffect } from 'react';
import { StudioCard, StudioNativeSelect } from '@studio/components';
import type {
  Summary2OverrideConfig,
  SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { useCustomConfigType } from './hook/useCustomConfigType';
import { useTranslation } from 'react-i18next';

export interface Summary2OverrideDisplaytypeProps {
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
}

export const Summary2OverrideDisplaytype = ({
  override,
  onChange,
}: Summary2OverrideDisplaytypeProps) => {
  const customConfigType = useCustomConfigType();
  const { t } = useTranslation();

  useEffect(() => {
    if (!override.displayType) {
      const updatedCustomType = { ...override, displayType: 'string' as SummaryCustomTargetType };
      onChange(updatedCustomType);
    }
  }, [override, onChange]);

  const handleCustomTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as SummaryCustomTargetType;
    const updatedCustomType = { ...override, displayType: newType };
    onChange(updatedCustomType);
  };

  return (
    <StudioCard.Content>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.overrides_type')}
        onChange={handleCustomTypeChange}
        value={override.displayType || 'string'}
      >
        {customConfigType.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </StudioNativeSelect>
    </StudioCard.Content>
  );
};
