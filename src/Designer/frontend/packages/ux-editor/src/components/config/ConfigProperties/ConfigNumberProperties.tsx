import React from 'react';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { EditNumberValue } from '../editModal/EditNumberValue';
import type { SchemaConfigProps } from './types';
import { componentComparison } from './ConfigPropertiesUtils';
import { useConfigProperty } from './useConfigProperty';

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
        <ConfigNumberProperty
          key={propertyKey}
          propertyKey={propertyKey}
          schema={schema}
          component={initialComponent}
          handleComponentUpdate={handleComponentUpdate}
          className={className}
          enumValues={schema.properties[propertyKey]?.enum}
        />
      ))}
    </>
  );
};

type ConfigNumberPropertyProps = Partial<SchemaConfigProps> & {
  propertyKey: string;
  className?: string;
  enumValues?: number[];
};

const ConfigNumberProperty = ({
  component: initialComponent,
  propertyKey,
  handleComponentUpdate,
  className,
  enumValues,
}: ConfigNumberPropertyProps) => {
  const {
    initialPropertyValue,
    currentComponent,
    handleComponentChange,
    setCurrentPropertyValue,
    propertyLabel,
  } = useConfigProperty({ initialComponent, propertyKey });

  return (
    <SelectPropertyEditor
      property={propertyLabel}
      value={currentComponent[propertyKey]}
      className={className}
      onSave={() => handleComponentUpdate(currentComponent)}
      onCancel={() => setCurrentPropertyValue(initialPropertyValue)}
      isSaveDisabled={componentComparison({ initialComponent, currentComponent })}
    >
      <EditNumberValue
        component={currentComponent}
        handleComponentChange={handleComponentChange}
        propertyKey={propertyKey}
        enumValues={enumValues}
      />
    </SelectPropertyEditor>
  );
};
