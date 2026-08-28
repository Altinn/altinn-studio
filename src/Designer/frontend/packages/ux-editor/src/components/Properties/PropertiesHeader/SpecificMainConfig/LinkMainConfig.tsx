import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { getComponentDefinition } from '../../../../data/componentCatalog';

const linkMainProperties = ['style'];

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
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      properties={properties}
      stringPropertyKeys={linkMainProperties}
      className={className}
    />
  );
};
