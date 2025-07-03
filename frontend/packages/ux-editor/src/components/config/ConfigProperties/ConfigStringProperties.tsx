import React, { useMemo } from 'react';
import { useComponentPropertyLabel } from '../../../hooks';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { useComponentPropertyEnumValue } from '../../../hooks/useComponentPropertyEnumValue';
import { EditStringValue } from '../editModal/EditStringValue';
import type { SchemaConfigProps } from './types';

export interface ConfigStringPropertiesProps extends SchemaConfigProps {
  stringPropertyKeys: string[];
}

export const ConfigStringProperties = ({
  stringPropertyKeys,
  schema,
  component,
  handleComponentUpdate,
}: ConfigStringPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const selectedDataType = useComponentPropertyEnumValue();

  const memoizedSelectedStringPropertiesDisplay = useMemo(
    () => (propertyKey: string) => {
      const value = component[propertyKey];
      if (Array.isArray(value)) return value.map((dataType) => selectedDataType(dataType));
      return value ? selectedDataType(value) : undefined;
    },
    [component, selectedDataType],
  );

  return (
    <>
      {stringPropertyKeys.map((propertyKey) => (
        <SelectPropertyEditor
          key={propertyKey}
          property={componentPropertyLabel(propertyKey)}
          title={componentPropertyLabel(propertyKey)}
          value={memoizedSelectedStringPropertiesDisplay(propertyKey)}
        >
          <EditStringValue
            key={propertyKey}
            component={component}
            handleComponentChange={handleComponentUpdate}
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
