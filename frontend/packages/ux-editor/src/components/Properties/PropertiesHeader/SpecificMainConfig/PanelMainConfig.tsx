import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/Panel.schema.v1.json';
import React from 'react';
import { ConfigStringProperties } from '../../../config/ConfigProperties';

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
