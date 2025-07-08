import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';

export enum TitleProperties {
  size = 'size',
}

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
  const titlePropertySet = new Set<string>(Object.values(TitleProperties));
  const stringPropertyKeys = Object.keys(schema.properties).filter((key) =>
    titlePropertySet.has(key),
  );
  if (stringPropertyKeys.length === 0) {
    return null;
  }

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      schema={schema}
      stringPropertyKeys={stringPropertyKeys}
      className={className}
    />
  );
};
