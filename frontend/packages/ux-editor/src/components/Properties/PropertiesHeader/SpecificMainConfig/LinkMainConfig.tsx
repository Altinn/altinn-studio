import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import type { properties } from '../../../../testing/schemas/json/component/Link.schema.v1.json';

type LinkMainProperties = (keyof typeof properties)[];
export const LinkMainProperties: LinkMainProperties = ['style'];

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
      stringPropertyKeys={LinkMainProperties}
      className={className}
    />
  );
};
