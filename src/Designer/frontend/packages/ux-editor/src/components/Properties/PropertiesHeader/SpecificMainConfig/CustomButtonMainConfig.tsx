import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { getComponentDefinition } from '../../../../data/componentCatalog';

const customButtonMainProperties = ['buttonStyle'];

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
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      properties={properties}
      stringPropertyKeys={customButtonMainProperties}
      className={className}
    />
  );
};
