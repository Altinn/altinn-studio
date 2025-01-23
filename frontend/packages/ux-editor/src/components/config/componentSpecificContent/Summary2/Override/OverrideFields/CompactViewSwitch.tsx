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
  onChange: (updatedOverride: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const CompactViewSwitch = ({ onChange, override }: CompactViewSwitchProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);

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
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange({ ...override, isCompact: event.target.checked })
      }
      checked={override.isCompact ?? false}
      value='isCompact'
    >
      {t('ux_editor.component_properties.summary.override.is_compact')}
    </StudioSwitch>
  );
};
