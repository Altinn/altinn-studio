import React, { type ReactElement } from 'react';
import { StudioCard, StudioNativeSelect } from '@studio/components';
import type {
  Summary2OverrideConfig,
  SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { type CustomConfigType, useCustomConfigType } from './hook/useCustomConfigType';
import { useTranslation } from 'react-i18next';

export type Summary2OverrideDisplaytypeProps = {
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
};

export const Summary2OverrideDisplaytype = ({
  override,
  onChange,
}: Summary2OverrideDisplaytypeProps) => {
  const { t } = useTranslation();

  if (!override.displayType) {
    const updatedOverrideType = { ...override, displayType: 'string' } as Summary2OverrideConfig;
    onChange(updatedOverrideType);
    return null;
  }
  const handleCustomTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as SummaryCustomTargetType;
    const updatedCustomType = { displayType: newType, componentId: override.componentId };
    onChange(updatedCustomType);
  };

  return (
    <StudioCard.Content>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.overrides_type')}
        onChange={handleCustomTypeChange}
        value={override.displayType}
      >
        <CustomConfigTypeOptions />
      </StudioNativeSelect>
    </StudioCard.Content>
  );
};

const CustomConfigTypeOptions = (): ReactElement[] => {
  const customConfigTypes: CustomConfigType[] = useCustomConfigType();
  return customConfigTypes.map((type: CustomConfigType) => (
    <option key={type.value} value={type.value}>
      {type.label}
    </option>
  ));
};
