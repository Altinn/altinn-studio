import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { getComponentDefinition } from '@altinn/ux-editor/data/componentCatalog';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';

import type { JSX } from 'react';

export const titleMainProperties = ['size'];

export type TitleMainConfigProps = {
  component: FormItem<ComponentType.Heading>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const TitleMainConfig = ({
  component,
  handleComponentChange,
  className,
}: TitleMainConfigProps): JSX.Element => {
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <ConfigStringProperties
      component={component}
      handleComponentUpdate={handleComponentChange}
      properties={properties}
      stringPropertyKeys={titleMainProperties}
      className={className}
    />
  );
};
