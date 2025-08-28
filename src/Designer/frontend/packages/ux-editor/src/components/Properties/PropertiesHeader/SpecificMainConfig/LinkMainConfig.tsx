import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';
import type { properties } from '../../../../testing/schemas/json/component/Link.schema.v1.json';

type LinkMainProperties = (keyof typeof properties)[];
const linkMainProperties: LinkMainProperties = ['style'];

type LinkMainConfigProps = {
  component: FormItem<ComponentType.Link>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const LinkMainConfig = ({
  component,
  handleComponentChange,
  className,
}: LinkMainConfigProps): React.ReactElement => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={linkMainProperties}
      className={className}
    />
  );
};
