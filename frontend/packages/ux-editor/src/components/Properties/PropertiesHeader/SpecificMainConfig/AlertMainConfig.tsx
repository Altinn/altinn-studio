import React, { type ReactElement } from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';
import type { properties } from '../../../../testing/schemas/json/component/Alert.schema.v1.json';
import { ConfigStringProperties } from '@altinn/ux-editor/components/config/ConfigProperties';
import { EditTextResourceBindings } from '@altinn/ux-editor/components/config/editModal/EditTextResourceBindings/EditTextResourceBindings';

type AlertMainContentProperties = (keyof typeof properties)[];
const alertMainContentProperties: AlertMainContentProperties = ['severity'];

type AlertMainTextProperties = (keyof typeof properties.textResourceBindings.properties)[];
const alertMainTextProperties: AlertMainTextProperties = ['body'];

type AlertMainConfigProps = {
  component: FormItem<ComponentType.Alert>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const AlertMainConfig = ({
  component,
  handleComponentChange,
  className,
}: AlertMainConfigProps): ReactElement => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <div>
      <EditTextResourceBindings
        component={component}
        handleComponentChange={handleComponentChange}
        textResourceBindingKeys={alertMainTextProperties}
      />
      <ConfigStringProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        schema={schema}
        stringPropertyKeys={alertMainContentProperties}
        className={className}
      />
    </div>
  );
};
