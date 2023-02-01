import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';

export const EditTitle = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  return (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey='title'
      labelKey='ux_editor.modal_properties_label'
    />
  );
};
