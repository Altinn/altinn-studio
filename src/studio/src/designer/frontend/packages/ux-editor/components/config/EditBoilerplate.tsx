import React from 'react';
import { renderSelectDataModelBinding, SelectTextFromRecources } from '../../utils/render';
import type { FormComponentType } from '../../types/global';

export interface EditBoilerplateProps {
  component: FormComponentType;
  textResources: any;
  handleDataModelChange: (selectedDataModelElement: string, key: string) => void;
  handleTitleChange: (e: any) => void;
  handleDescriptionChange: (e: any) => void;
  language: any;
}
const EditBoilerplate: React.FunctionComponent<EditBoilerplateProps> = (props: EditBoilerplateProps) => {
  const { component, textResources, handleDataModelChange, handleTitleChange, handleDescriptionChange, language } =
    props;
  return (
    <>
      {renderSelectDataModelBinding(component.dataModelBindings, handleDataModelChange, language)}
      <SelectTextFromRecources
        labelText={'modal_properties_label_helper'}
        onChangeFunction={handleTitleChange}
        textResources={textResources}
        language={language}
        placeholder={component.textResourceBindings?.title}
        description={component.textResourceBindings?.title}
      />
      <SelectTextFromRecources
        labelText={'modal_properties_description_helper'}
        onChangeFunction={handleDescriptionChange}
        textResources={textResources}
        language={language}
        placeholder={component.textResourceBindings?.description}
        description={component.textResourceBindings?.description}
      />
    </>
  );
};

export default EditBoilerplate;
