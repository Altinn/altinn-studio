import React, { useMemo, useState } from 'react';
import { EditStringValue } from '../editModal/EditStringValue';
import { useComponentPropertyLabel } from '../../../hooks';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import type { SchemaConfigProps } from './types';
import type { FormItem } from '../../../types/FormItem';
import { componentComparison } from './ConfigPropertiesUtils';

export interface ConfigArrayPropertiesProps extends SchemaConfigProps {
  arrayPropertyKeys: string[];
  className?: string;
  keepEditOpen?: boolean;
}

export const ConfigArrayProperties = ({
  schema,
  component: initialComponent,
  arrayPropertyKeys,
  handleComponentUpdate,
  className,
  keepEditOpen = false,
}: ConfigArrayPropertiesProps) => {
  const [currentComponent, setCurrentComponent] = useState<FormItem>(initialComponent);
  const componentPropertyLabel = useComponentPropertyLabel();
  const selectedDataType = useComponentPropertyEnumValue();

  const memoizedGetSelectedValuesDisplay = useMemo(
    () => (propertyKey: string) => {
      if (!currentComponent[propertyKey]?.length) return undefined;
      return currentComponent[propertyKey].map((dataType: string) => (
        <div key={dataType}>{selectedDataType(dataType)}</div>
      ));
    },
    [currentComponent, selectedDataType],
  );

  if (keepEditOpen) {
    return arrayPropertyKeys.map((propertyKey) => (
      <EditStringValue
        component={initialComponent}
        handleComponentChange={(updatedComponent) => handleComponentUpdate(updatedComponent)}
        propertyKey={propertyKey}
        key={propertyKey}
        enumValues={schema.properties[propertyKey]?.items?.enum}
        multiple={true}
      />
    ));
  }

  return (
    <>
      {arrayPropertyKeys.map((propertyKey) => (
        <SelectPropertyEditor
          key={propertyKey}
          property={componentPropertyLabel(propertyKey)}
          title={componentPropertyLabel(propertyKey)}
          value={memoizedGetSelectedValuesDisplay(propertyKey)}
          className={className}
          onSave={() => handleComponentUpdate(currentComponent)}
          onCancel={() => setCurrentComponent(initialComponent)}
          isSaveDisabled={componentComparison({ initialComponent, currentComponent })}
        >
          <EditStringValue
            component={currentComponent}
            handleComponentChange={setCurrentComponent}
            propertyKey={propertyKey}
            enumValues={schema.properties[propertyKey]?.items?.enum}
            multiple={true}
          />
        </SelectPropertyEditor>
      ))}
    </>
  );
};
