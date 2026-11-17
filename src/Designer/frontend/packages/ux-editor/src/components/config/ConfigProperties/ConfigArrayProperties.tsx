import { EditStringValue } from '../editModal/EditStringValue';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import type { CatalogConfigProps } from './types';
import { componentComparison } from './ConfigPropertiesUtils';
import { useTranslateKeyValue } from './useTranslateKeyValue';
import { useConfigProperty } from './useConfigProperty';
import { getArrayStringChoices } from '../../../data/componentCatalog';

export interface ConfigArrayPropertiesProps extends CatalogConfigProps {
  arrayPropertyKeys: string[];
  className?: string;
  keepEditOpen?: boolean;
}

export const ConfigArrayProperties = ({
  properties,
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
        enumValues={getArrayChoices(properties[propertyKey])}
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
          properties={properties}
          component={initialComponent}
          handleComponentUpdate={handleComponentUpdate}
          className={className}
          enumValues={getArrayChoices(properties[propertyKey])}
        />
      ))}
    </>
  );
};

type ConfigArrayPropertyProps = Partial<CatalogConfigProps> & {
  propertyKey: string;
  className?: string;
  enumValues?: string[];
};

const getArrayChoices = (property: CatalogConfigProps['properties'][string]): string[] =>
  getArrayStringChoices(property);

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
