import React from 'react';
import { EditStringValue } from '../editModal/EditStringValue';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import type { SchemaConfigProps } from './types';
import { componentComparison } from './ConfigPropertiesUtils';
import { useTranslateKeyValue } from './useTranslateKeyValue';
import { useConfigProperty } from './useConfigProperty';

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
        <ConfigArrayProperty
          key={propertyKey}
          propertyKey={propertyKey}
          schema={schema}
          component={initialComponent}
          handleComponentUpdate={handleComponentUpdate}
          className={className}
          enumValues={schema.properties[propertyKey]?.items?.enum}
        />
      ))}
    </>
  );
};

type ConfigArrayPropertyProps = Partial<SchemaConfigProps> & {
  propertyKey: string;
  className?: string;
  enumValues?: string[];
};

const ConfigArrayProperty = ({
  component: initialComponent,
  propertyKey,
  handleComponentUpdate,
  className,
  enumValues,
}: ConfigArrayPropertyProps) => {
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
        multiple={true}
      />
    </SelectPropertyEditor>
  );
};
