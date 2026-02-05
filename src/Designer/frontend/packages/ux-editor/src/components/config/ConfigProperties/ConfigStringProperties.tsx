import React from 'react';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { EditStringValue } from '../editModal/EditStringValue';
import type { SchemaConfigProps } from './types';
import { componentComparison } from './ConfigPropertiesUtils';
import { useTranslateKeyValue } from './useTranslateKeyValue';
import { useConfigProperty } from './useConfigProperty';

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
        <ConfigStringProperty
          key={propertyKey}
          propertyKey={propertyKey}
          component={initialComponent}
          handleComponentUpdate={handleComponentUpdate}
          className={className}
          enumValues={
            schema.properties[propertyKey]?.enum || schema.properties[propertyKey]?.examples
          }
        />
      ))}
    </>
  );
};

type ConfigStringPropertyProps = Partial<SchemaConfigProps> & {
  propertyKey: string;
  className?: string;
  enumValues?: string[];
};

const ConfigStringProperty = ({
  component: initialComponent,
  propertyKey,
  handleComponentUpdate,
  className,
  enumValues,
}: ConfigStringPropertyProps) => {
  const {
    initialPropertyValue,
    currentComponent,
    handleComponentChange,
    setCurrentPropertyValue,
    propertyLabel,
  } = useConfigProperty({ initialComponent, propertyKey });

  const translatedKeyValue = useTranslateKeyValue(initialPropertyValue);

  return (
    <SelectPropertyEditor
      property={propertyLabel}
      title={propertyLabel}
      value={translatedKeyValue}
      className={className}
      onSave={() => handleComponentUpdate(currentComponent)}
      onCancel={() => setCurrentPropertyValue(initialPropertyValue)}
      isSaveDisabled={componentComparison({ initialComponent, currentComponent })}
    >
      <EditStringValue
        component={currentComponent}
        handleComponentChange={handleComponentChange}
        propertyKey={propertyKey}
        enumValues={enumValues}
      />
    </SelectPropertyEditor>
  );
};
