import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { getComponentDefinition } from '../../../../data/componentCatalog';

const actionButtonMainProperties = ['action', 'buttonStyle'];

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
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      properties={properties}
      stringPropertyKeys={actionButtonMainProperties}
      className={className}
    />
  );
};
