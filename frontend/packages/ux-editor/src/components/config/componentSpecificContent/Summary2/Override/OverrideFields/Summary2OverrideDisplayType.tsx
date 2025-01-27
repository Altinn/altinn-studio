import React, { type ReactElement } from 'react';
import { StudioCard, StudioNativeSelect } from '@studio/components';
import type {
  Summary2OverrideConfig,
  SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { type CustomConfigType, useCustomConfigType } from '../hook/useCustomConfigType';
import { useTranslation } from 'react-i18next';
import { mapSelectedTypeToConfig } from '../utils';
import { ComponentType } from 'app-shared/types/ComponentType';

export type Summary2OverrideDisplayTypeProps = {
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
};

export const Summary2OverrideDisplayType = ({
  override,
  onChange,
}: Summary2OverrideDisplayTypeProps) => {
  const { t } = useTranslation();

  const handleCustomTypeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const newSelectedType = event.target.value as SummaryCustomTargetType;
    const summary2OverrideConfig = mapSelectedTypeToConfig(newSelectedType, override.componentId);
    onChange(summary2OverrideConfig);
  };

  const checkboxOrMultipleselect =
    override.componentId?.includes(ComponentType.MultipleSelect) ||
    override.componentId?.includes(ComponentType.Checkboxes);

  if (!checkboxOrMultipleselect) {
    return null;
  }

  return (
    <StudioCard.Content>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.summary.override.display_type')}
        onChange={handleCustomTypeChange}
        value={override.displayType || 'string'}
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
