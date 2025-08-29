import React from 'react';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/Text.schema.v1.json';

type TextMainProperties = (keyof typeof properties)[];
const textMainProperties: TextMainProperties = ['value'];

export type TextMainConfigProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
  className?: string;
};
export const TextMainConfig = ({
  component,
  handleComponentChange,
  className,
}: TextMainConfigProps): JSX.Element => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={textMainProperties}
      className={className}
    />
  );
};
