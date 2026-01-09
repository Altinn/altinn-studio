import React, { useMemo, useState } from 'react';
import { useComponentPropertyLabel } from '../../../hooks';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { useComponentPropertyEnumValue } from '../../../hooks/useComponentPropertyEnumValue';
import { EditStringValue } from '../editModal/EditStringValue';
import type { SchemaConfigProps } from './types';
import type { FormItem } from '../../../types/FormItem';
import { componentComparison } from './ConfigPropertiesUtils';

export interface ConfigStringPropertiesProps extends SchemaConfigProps {
  stringPropertyKeys: string[];
  className?: string;
  keepEditOpen?: boolean;
}

export const ConfigStringProperties = ({
  stringPropertyKeys,
  schema,
  component: initialComponent,
  handleComponentUpdate,
  className,
  keepEditOpen = false,
}: ConfigStringPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const selectedDataType = useComponentPropertyEnumValue();
  const [currentComponent, setCurrentComponent] = useState<FormItem>(initialComponent);

  const memoizedSelectedStringPropertiesDisplay = useMemo(
    () => (propertyKey: string) => {
      const value = currentComponent[propertyKey];
      if (Array.isArray(value)) return value.map((dataType) => selectedDataType(dataType));
      return value ? selectedDataType(value) : undefined;
    },
    [currentComponent, selectedDataType],
  );

  if (keepEditOpen) {
    return stringPropertyKeys.map((propertyKey) => (
      <EditStringValue
        key={propertyKey}
        component={initialComponent}
        handleComponentChange={handleComponentUpdate}
        propertyKey={propertyKey}
        enumValues={
          schema.properties[propertyKey]?.enum || schema.properties[propertyKey]?.examples
        }
      />
    ));
  }

  return (
    <>
      {stringPropertyKeys.map((propertyKey) => (
        <SelectPropertyEditor
          key={propertyKey}
          property={componentPropertyLabel(propertyKey)}
          title={componentPropertyLabel(propertyKey)}
          value={memoizedSelectedStringPropertiesDisplay(propertyKey)}
          className={className}
          onSave={() => handleComponentUpdate(currentComponent)}
          onCancel={() => setCurrentComponent(initialComponent)}
          isSaveDisabled={componentComparison({ initialComponent, currentComponent })}
        >
          <EditStringValue
            component={currentComponent}
            handleComponentChange={setCurrentComponent}
            propertyKey={propertyKey}
            enumValues={
              schema.properties[propertyKey]?.enum || schema.properties[propertyKey]?.examples
            }
          />
        </SelectPropertyEditor>
      ))}
    </>
  );
};
