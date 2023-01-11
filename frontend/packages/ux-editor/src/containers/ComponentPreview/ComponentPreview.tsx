import React from 'react';
import { IGenericEditComponent } from '../../components/config/componentConfig';
import { ComponentTypes } from '../../components';
import { CheckboxGroupPreview } from './CheckboxGroupPreview';
import { IFormCheckboxComponent } from '../../types/global';

export interface ComponentPreviewProps extends IGenericEditComponent {}

export const ComponentPreview = ({
  component,
  handleComponentChange
}: ComponentPreviewProps) => {

  switch (component.type) {
    case ComponentTypes.Checkboxes:
      return <CheckboxGroupPreview
        component={component as IFormCheckboxComponent}
        handleComponentChange={handleComponentChange}
      />;
    default:
      return <p>Forhåndsvisning er ikke implementert for denne komponenten.</p>;
  }
};
