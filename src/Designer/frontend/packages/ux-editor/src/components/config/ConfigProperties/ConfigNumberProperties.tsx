import React, { useState } from 'react';
import { useComponentPropertyLabel } from '../../../hooks';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { EditNumberValue } from '../editModal/EditNumberValue';
import type { SchemaConfigProps } from './types';
import type { FormItem } from '../../../types/FormItem';
import { componentComparison } from './ConfigPropertiesUtils';

export interface ConfigNumberPropertiesProps extends SchemaConfigProps {
  numberPropertyKeys: string[];
  className?: string;
  keepEditOpen?: boolean;
}

export const ConfigNumberProperties = ({
  schema,
  component: initialComponent,
  numberPropertyKeys,
  handleComponentUpdate,
  className,
  keepEditOpen = false,
}: ConfigNumberPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [currentComponent, setCurrentComponent] = useState<FormItem>(initialComponent);

  if (keepEditOpen) {
    return numberPropertyKeys.map((propertyKey) => (
      <EditNumberValue
        component={initialComponent}
        handleComponentChange={handleComponentUpdate}
        propertyKey={propertyKey}
        key={propertyKey}
        enumValues={schema.properties[propertyKey]?.enum}
      />
    ));
  }

  return (
    <>
      {numberPropertyKeys.map((propertyKey) => (
        <SelectPropertyEditor
          key={propertyKey}
          property={componentPropertyLabel(
            `${propertyKey}${propertyKey === 'preselectedOptionIndex' ? '_button' : ''}`,
          )}
          title={componentPropertyLabel(propertyKey)}
          value={currentComponent[propertyKey]}
          className={className}
          onSave={() => handleComponentUpdate(currentComponent)}
          onCancel={() => setCurrentComponent(initialComponent)}
          isSaveDisabled={componentComparison({ initialComponent, currentComponent })}
        >
          <EditNumberValue
            component={initialComponent}
            handleComponentChange={setCurrentComponent}
            propertyKey={propertyKey}
            enumValues={schema.properties[propertyKey]?.enum}
          />
        </SelectPropertyEditor>
      ))}
    </>
  );
};
