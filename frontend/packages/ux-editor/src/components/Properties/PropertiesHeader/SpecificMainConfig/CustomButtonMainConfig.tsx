import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/CustomButton.schema.v1.json';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';

type CustomButtonMainProperties = (keyof typeof properties)[];
const customButtonMainProperties: CustomButtonMainProperties = ['buttonStyle'];

type CustomButtonMainConfigProps = {
  component: FormItem<ComponentType.CustomButton>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const CustomButtonMainConfig = ({
  component,
  handleComponentChange,
  className,
}: CustomButtonMainConfigProps): React.ReactElement => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={customButtonMainProperties}
      className={className}
    />
  );
};
