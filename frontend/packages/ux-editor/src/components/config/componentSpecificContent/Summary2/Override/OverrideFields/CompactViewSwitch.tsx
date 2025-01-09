import React, { type ChangeEvent } from 'react';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../../../hooks';
import { useFormLayoutsQuery } from '../../../../../../hooks/queries/useFormLayoutsQuery';
import { getAllLayoutComponents } from '../../../../../../utils/formLayoutUtils';
import { ComponentType } from 'app-shared/types/ComponentType';

type CompactViewSwitchProps = {
  onChange: (label: keyof Summary2OverrideConfig, value: string | boolean) => void;
  override: Summary2OverrideConfig;
};

export const CompactViewSwitch = ({ onChange, override }: CompactViewSwitchProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange(event.target.value as keyof Summary2OverrideConfig, event.target.checked);
  const components = Object.values(formLayoutsData).flatMap((layout) =>
    getAllLayoutComponents(layout),
  );
  const component = components.find((comp) => comp.id === override.componentId);
  const isGroupComponent = component?.type === (ComponentType.Group as ComponentType);

  if (!isGroupComponent) {
    return null;
  }
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={handleChange}
      checked={override.isCompact ?? false}
      value='isCompact'
    >
      {t('ux_editor.component_properties.summary.override.is_compact')}
    </StudioSwitch>
  );
};
