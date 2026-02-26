import React from 'react';
import { useFormItemContext } from '../../containers/FormItemContext';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings/EditTextResourceBindings';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import type { FormComponent } from '../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppContext } from '../../hooks';
import { EditSubformTableColumns } from './EditSubformTableColumns';
import { type FormContainer } from '@altinn/ux-editor/types/FormContainer';

export const Text = () => {
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
  const { data: schema } = useComponentSchemaQuery(form.type);
  const { selectedFormLayoutName } = useAppContext();

  const handleComponentChange = async (updatedComponent: FormContainer | FormComponent) => {
    handleUpdate(updatedComponent);
    await debounceSave(formId, updatedComponent);
  };

  return (
    <>
      <EditTextResourceBindings
        component={form}
        handleComponentChange={handleComponentChange}
        textResourceBindingKeys={Object.keys(schema.properties.textResourceBindings.properties)}
        layoutName={selectedFormLayoutName}
      />
      {form.type === ComponentType.Subform && (
        <EditSubformTableColumns component={form} handleComponentChange={handleComponentChange} />
      )}
    </>
  );
};
