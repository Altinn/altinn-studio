import React from 'react';
import { StudioCard, StudioNativeSelect } from '@studio/components';
import type {
  Summary2OverrideConfig,
  SummaryCustomTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { type CustomConfigType, useCustomConfigType } from '../hook/useCustomConfigType';
import { useTranslation } from 'react-i18next';
import { mapSelectedTypeToConfig } from '../utils';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { TargetComponentProps } from '../../Summary2Target/targetUtils';

export type Summary2OverrideDisplayTypeProps = {
  override: Summary2OverrideConfig;
  componentOptions: TargetComponentProps[];
  onChange: (override: Summary2OverrideConfig) => void;
};

export const Summary2OverrideDisplayType = ({
  override,
  componentOptions,
  onChange,
}: Summary2OverrideDisplayTypeProps) => {
  const { t } = useTranslation();
  const { displayType, componentId } = override;
  const selectedComponentType = componentOptions?.find((comp) => comp.id === componentId)?.type;
  const customConfigTypes: CustomConfigType[] = useCustomConfigType();

  const checkboxOrMultipleselect =
    selectedComponentType?.includes(ComponentType.MultipleSelect) ||
    selectedComponentType?.includes(ComponentType.Checkboxes);

  if (!checkboxOrMultipleselect) {
    return null;
  }

  const handleCustomTypeChange = (newDisplayType: SummaryCustomTargetType): void => {
    const summary2OverrideConfig = mapSelectedTypeToConfig({
      componentId,
      displayType: newDisplayType,
    });
    onChange(summary2OverrideConfig);
  };

  return (
    <StudioCard.Content>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.summary.override.display_type')}
        value={displayType || 'list'}
        onChange={(e) => handleCustomTypeChange(e.target.value as SummaryCustomTargetType)}
      >
        {customConfigTypes.map((type: CustomConfigType) => (
          <option key={type.label} value={type.value}>
            {type.label}
          </option>
        ))}
      </StudioNativeSelect>
    </StudioCard.Content>
  );
};
