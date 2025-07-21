import React from 'react';
import { useComponentPropertyLabel } from '../../../hooks';
import { SelectPropertyEditor } from '../SelectPropertyEditor';
import { EditNumberValue } from '../editModal/EditNumberValue';
import type { SchemaConfigProps } from './types';

export interface ConfigNumberPropertiesProps extends SchemaConfigProps {
  numberPropertyKeys: string[];
  className?: string;
}

export const ConfigNumberProperties = ({
  schema,
  component,
  numberPropertyKeys,
  handleComponentUpdate,
  className,
}: ConfigNumberPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();

  return (
    <>
      {numberPropertyKeys.map((propertyKey) => {
        return (
          <SelectPropertyEditor
            key={propertyKey}
            property={componentPropertyLabel(
              `${propertyKey}${propertyKey === 'preselectedOptionIndex' ? '_button' : ''}`,
            )}
            title={componentPropertyLabel(propertyKey)}
            value={component[propertyKey]}
            className={className}
          >
            <EditNumberValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              enumValues={schema.properties[propertyKey]?.enum}
            />
          </SelectPropertyEditor>
        );
      })}
    </>
  );
};
