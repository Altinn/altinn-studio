import React from 'react';
import { EditDataModelBindings } from '../../config/editModal/EditDataModelBindings';
import type { FormComponent } from '../../../types/FormComponent';

type DataModelBindingRowProps = {
  schema: any;
  component: FormComponent;
  formId: string;
  handleComponentUpdate: (component: FormComponent) => void;
};

export const DataModelBindingRow = ({
  schema,
  component,
  formId,
  handleComponentUpdate,
}: DataModelBindingRowProps): React.JSX.Element => {
  const { dataModelBindings } = schema.properties;

  return (
    dataModelBindings?.properties && (
      <>
        {Object.keys(dataModelBindings?.properties).map((propertyKey: any) => {
          return (
            <EditDataModelBindings
              key={`${component.id}-datamodel-${propertyKey}`}
              component={component}
              handleComponentChange={handleComponentUpdate}
              editFormId={formId}
              helpText={dataModelBindings?.properties[propertyKey]?.description}
              renderOptions={{
                key: propertyKey,
                label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
              }}
            />
          );
        })}
      </>
    )
  );
};
