import React from 'react';
import { SelectTextFromRecources } from '../../../utils/render';
import type { IGenericEditComponent } from '../componentConfig';

export const EditDescription = ({ component, handleComponentChange, language, textResources }: IGenericEditComponent) => {

  const handleDescriptionChange = (e: any) => {
    const selectedDescription = e.value;
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        description: selectedDescription,
      },
    });
  };

  return (
    <SelectTextFromRecources
      labelText='modal_properties_description_helper'
      language={language}
      onChangeFunction={handleDescriptionChange}
      textResources={textResources}
      placeholder={component.textResourceBindings?.description}
    />
  );
};
