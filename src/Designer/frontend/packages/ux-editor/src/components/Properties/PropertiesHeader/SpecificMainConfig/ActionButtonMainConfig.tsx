import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/ActionButton.schema.v1.json';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';

type ActionButtonMainProperties = (keyof typeof properties)[];
const actionButtonMainProperties: ActionButtonMainProperties = ['action', 'buttonStyle'];

type ActionButtonMainConfigProps = {
  component: FormItem<ComponentType.ActionButton>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const ActionButtonMainConfig = ({
  component,
  handleComponentChange,
  className,
}: ActionButtonMainConfigProps): React.ReactElement => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={actionButtonMainProperties}
      className={className}
    />
  );
};
