import React, { useMemo } from 'react';
import { EditStringValue } from '../editModal/EditStringValue';
import { useComponentPropertyLabel } from '../../../hooks';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import type { SchemaConfigProps } from './types';

export interface ConfigArrayPropertiesProps extends SchemaConfigProps {
  arrayPropertyKeys: string[];
  className?: string;
}

export const ConfigArrayProperties = ({
  schema,
  component,
  arrayPropertyKeys,
  handleComponentUpdate,
  className,
}: ConfigArrayPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();

  const selectedDataType = useComponentPropertyEnumValue();

  const memoizedGetSelectedValuesDisplay = useMemo(
    () => (propertyKey: string) => {
      if (!component[propertyKey]?.length) return undefined;
      return component[propertyKey].map((dataType: string) => (
        <div key={dataType}>{selectedDataType(dataType)}</div>
      ));
    },
    [component, selectedDataType],
  );

  return (
    <>
      {arrayPropertyKeys.map((propertyKey) => {
        return (
          <SelectPropertyEditor
            key={propertyKey}
            property={componentPropertyLabel(propertyKey)}
            title={componentPropertyLabel(propertyKey)}
            value={memoizedGetSelectedValuesDisplay(propertyKey)}
            className={className}
          >
            <EditStringValue
              component={component}
              handleComponentChange={(updatedComponent) => {
                handleComponentUpdate(updatedComponent);
              }}
              propertyKey={propertyKey}
              key={propertyKey}
              enumValues={schema.properties[propertyKey]?.items?.enum}
              multiple={true}
            />
          </SelectPropertyEditor>
        );
      })}
    </>
  );
};
