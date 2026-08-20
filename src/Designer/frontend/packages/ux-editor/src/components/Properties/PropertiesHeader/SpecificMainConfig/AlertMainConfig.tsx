import type { ReactElement } from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { getComponentDefinition } from '../../../../data/componentCatalog';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { EditTextResourceBindings } from '../../../config/editModal/EditTextResourceBindings/EditTextResourceBindings';

const alertMainContentProperties = ['severity'];

const alertMainTextProperties = ['body'];

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
  const properties = getComponentDefinition(component.type)?.properties ?? {};

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
        properties={properties}
        stringPropertyKeys={alertMainContentProperties}
        className={className}
      />
    </div>
  );
};
