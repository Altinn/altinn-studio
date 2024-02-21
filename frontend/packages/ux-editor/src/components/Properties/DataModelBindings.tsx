import React from 'react';
import { EditDataModelBindings } from '../config/editModal/EditDataModelBindings';
import { StudioSpinner } from '@studio/components';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { useFormContext } from '../../containers/FormContext';
import { useText } from '../../hooks';
import classes from './DataModelBindings.module.css';

export const DataModelBindings = (): React.JSX.Element => {
  const { formId, form, handleUpdate } = useFormContext();
  const { data: schema } = useComponentSchemaQuery(form.type);
  const t = useText();

  if (!schema) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  const { dataModelBindings } = schema.properties;

  return (
    dataModelBindings?.properties && (
      <>
        {Object.keys(dataModelBindings?.properties).map((propertyKey: string) => {
          return (
            <div className={classes.dataModelBindings} key={`${form.id}-datamodel-${propertyKey}`}>
              <EditDataModelBindings
                component={form}
                handleComponentChange={handleUpdate}
                editFormId={formId}
                helpText={dataModelBindings?.properties[propertyKey]?.description}
                renderOptions={{
                  key: propertyKey,
                  label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
                }}
              />
            </div>
          );
        })}
      </>
    )
  );
};
