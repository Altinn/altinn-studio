import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';

export const EditDescription = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  return (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey='description'
      labelKey='ux_editor.modal_properties_description'
      placeholderKey='ux_editor.modal_properties_description_add'
    />
  );
};
