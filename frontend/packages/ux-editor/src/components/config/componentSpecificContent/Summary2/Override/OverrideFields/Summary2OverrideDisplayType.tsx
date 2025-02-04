import React from 'react';
import { StudioCard, StudioCombobox } from '@studio/components';
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
  const selectedComponentType = componentOptions?.find(
    (comp) => comp.id === override?.componentId,
  )?.type;
  const customConfigTypes: CustomConfigType[] = useCustomConfigType();

  const checkboxOrMultipleselect =
    selectedComponentType?.includes(ComponentType.MultipleSelect) ||
    selectedComponentType?.includes(ComponentType.Checkboxes);

  if (!checkboxOrMultipleselect) {
    return null;
  }

  const handleCustomTypeChange = (newSelectedType: string): void => {
    if (!['list', 'string', 'notSet'].includes(newSelectedType)) return;
    const summary2OverrideConfig = mapSelectedTypeToConfig(
      newSelectedType as SummaryCustomTargetType,
      override.componentId,
    );
    onChange(summary2OverrideConfig);
  };

  return (
    <StudioCard.Content>
      <StudioCombobox
        size='sm'
        label={t('ux_editor.component_properties.summary.override.display_type')}
        onValueChange={(e) => handleCustomTypeChange(e[0])}
        value={override?.displayType ? [override.displayType] : ['notSet']}
      >
        {customConfigTypes.map((type: CustomConfigType) => (
          <StudioCombobox.Option key={type.value} value={type.value}>
            {type.label}
          </StudioCombobox.Option>
        ))}
      </StudioCombobox>
    </StudioCard.Content>
  );
};
