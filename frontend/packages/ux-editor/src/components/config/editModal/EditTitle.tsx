import React from 'react';
import { SelectTextFromRecources } from '../../../utils/render';
import type { IGenericEditComponent } from '../componentConfig';

export const EditTitle = ({ component, handleComponentChange, language, textResources }: IGenericEditComponent) => {
  const handleTitleChange = (e: any) => {
    const selectedTitle = e.value;
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        title: selectedTitle,
      },
    });
  };

  return (
    <SelectTextFromRecources
      description={component.textResourceBindings?.title}
      labelText={'modal_properties_label_helper'}
      language={language}
      onChangeFunction={handleTitleChange}
      placeholder={component.textResourceBindings?.title}
      textResources={textResources}
    />
  );
};
