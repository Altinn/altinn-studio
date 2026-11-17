import { getComponentDefinition } from '../../../../data/componentCatalog';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import React from 'react';
import { ConfigStringProperties } from '../../../config/ConfigProperties';

export const panelMainProperties = ['variant'];

type PanelMainConfigProps = {
  component: FormItem<ComponentType.Panel>;
  className?: string;
  handleComponentChange: (component: FormItem<ComponentType.Panel>) => void;
};

export const PanelMainConfig = ({
  component,
  className,
  handleComponentChange,
}: PanelMainConfigProps): React.ReactElement => {
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <ConfigStringProperties
      stringPropertyKeys={panelMainProperties}
      properties={properties}
      component={component}
      handleComponentUpdate={handleComponentChange}
      className={className}
    />
  );
};
