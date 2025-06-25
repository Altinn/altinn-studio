import React from 'react';
import { SelectPropertyEditor } from '@altinn/ux-editor/components/config/SelectPropertyEditor';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditStringValue } from '@altinn/ux-editor/components/config/editModal/EditStringValue';

export type TextValueMainConfigProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
};
export const TextValueMainConfig = ({
  component,
  handleComponentChange,
}: TextValueMainConfigProps): JSX.Element => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const selectedDataType = useComponentPropertyEnumValue();
  const schema = useComponentSchemaQuery(component.type);
  const mainStringProperties = ['value'];

  const validMainProperties = schema.data?.properties
    ? Object.keys(schema.data.properties).filter((key) => mainStringProperties.includes(key))
    : [];

  if (validMainProperties.length === 0) return null;

  return (
    <>
      {validMainProperties.map((property) => (
        <SelectPropertyEditor
          key={property}
          property={componentPropertyLabel(property)}
          title={componentPropertyLabel(property)}
          value={property ? selectedDataType(property) : undefined}
        >
          <EditStringValue
            key={property}
            component={component}
            handleComponentChange={handleComponentChange}
            propertyKey={property}
          />
        </SelectPropertyEditor>
      ))}
    </>
  );
  // return (
  //   <div>
  //     <p>This is the TextMainConfig component.</p>
  //     {/* Add your specific text main configuration logic here */}
  //   </div>
  // );
};
