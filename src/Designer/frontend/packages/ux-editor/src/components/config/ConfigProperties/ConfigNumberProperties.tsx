import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { EditNumberValue } from '../editModal/EditNumberValue';
import type { CatalogConfigProps } from './types';
import { componentComparison } from './ConfigPropertiesUtils';
import { useConfigProperty } from './useConfigProperty';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { getNumberChoices } from '../../../data/componentCatalog';
import type { PropertyDefinition } from '@app/layout-contract';

export interface ConfigNumberPropertiesProps extends CatalogConfigProps {
  numberPropertyKeys: string[];
  className?: string;
  keepEditOpen?: boolean;
}

export const ConfigNumberProperties = ({
  properties,
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
        enumValues={getNumberChoices(properties[propertyKey])}
        definition={properties[propertyKey]}
      />
    ));
  }

  return (
    <>
      {numberPropertyKeys.map((propertyKey) => (
        <ConfigNumberProperty
          key={propertyKey}
          propertyKey={propertyKey}
          properties={properties}
          component={initialComponent}
          handleComponentUpdate={handleComponentUpdate}
          className={className}
          enumValues={getNumberChoices(properties[propertyKey])}
          definition={properties[propertyKey]}
        />
      ))}
    </>
  );
};

type ConfigNumberPropertyProps = Partial<CatalogConfigProps> & {
  propertyKey: string;
  className?: string;
  enumValues?: number[];
  definition?: PropertyDefinition;
};

const ConfigNumberProperty = ({
  component: initialComponent,
  propertyKey,
  handleComponentUpdate,
  className,
  enumValues,
  definition,
}: ConfigNumberPropertyProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const {
    initialPropertyValue,
    currentComponent,
    handleComponentChange,
    setCurrentPropertyValue,
    propertyLabel,
  } = useConfigProperty({ initialComponent, propertyKey });

  const propertyLabelWithSuffix =
    propertyKey === 'preselectedOptionIndex' && componentPropertyLabel(`${propertyKey}_button`);

  return (
    <SelectPropertyEditor
      title={propertyLabel}
      property={propertyLabelWithSuffix || propertyLabel}
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
        definition={definition}
      />
    </SelectPropertyEditor>
  );
};
