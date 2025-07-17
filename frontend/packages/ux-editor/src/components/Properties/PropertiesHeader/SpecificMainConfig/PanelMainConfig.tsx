import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/Panel.schema.v1.json';
import React from 'react';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';

type PanelMainProperties = (keyof typeof properties)[];
export const panelMainProperties: PanelMainProperties = ['variant'];

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
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      stringPropertyKeys={panelMainProperties}
      schema={schema}
      component={component}
      handleComponentUpdate={handleComponentChange}
      className={className}
    />
  );
};
