import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';
import type { properties } from '../../../../testing/schemas/json/component/Header.schema.v1.json';

type TitleMainProperties = (keyof typeof properties)[];
export const titleMainProperties: TitleMainProperties = ['size'];

export type TitleMainConfigProps = {
  component: FormItem<ComponentType.Header>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const TitleMainConfig = ({
  component,
  handleComponentChange,
  className,
}: TitleMainConfigProps): JSX.Element => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={titleMainProperties}
      className={className}
    />
  );
};
