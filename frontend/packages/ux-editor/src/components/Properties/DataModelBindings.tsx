import React from 'react';
import { EditDataModelBindings } from '../config/editModal/EditDataModelBindings';
import { StudioSpinner } from '@studio/components';
import { Alert } from '@digdir/design-system-react';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useText } from '../../hooks';
import classes from './DataModelBindings.module.css';

export const DataModelBindings = (): React.JSX.Element => {
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const { data: schema } = useComponentSchemaQuery(formItem.type);
  const t = useText();

  if (!schema) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  const { dataModelBindings } = schema.properties;

  if (!dataModelBindings) {
    return <Alert>{t('ux_editor.modal_properties_data_model_binding_not_present')}</Alert>;
  }

  return (
    dataModelBindings?.properties && (
      <div className={classes.container}>
        {Object.keys(dataModelBindings?.properties).map((propertyKey: string) => {
          return (
            <div
              className={classes.dataModelBindings}
              key={`${formItem.id}-datamodel-${propertyKey}`}
            >
              <EditDataModelBindings
                component={formItem}
                handleComponentChange={async (updatedComponent) => {
                  handleUpdate(updatedComponent);
                  debounceSave(formItemId, updatedComponent);
                }}
                editFormId={formItemId}
                helpText={dataModelBindings?.properties[propertyKey]?.description}
                renderOptions={{
                  key: propertyKey,
                  label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
    )
  );
};
