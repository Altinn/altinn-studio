import { Grid } from '@material-ui/core';
import React from 'react';
import {
  renderSelectDataModelBinding,
  renderSelectTextFromResources,
} from '../../utils/render';
import type { FormComponentType } from '../../types/global';
export interface EditBoilerplateProps {
  component: FormComponentType;
  textResources: any;
  handleDataModelChange: (
    selectedDataModelElement: string,
    key: string,
  ) => void;
  handleTitleChange: (e: any) => void;
  handleDescriptionChange: (e: any) => void;
  language: any;
}
const EditBoilerplate: React.FunctionComponent<EditBoilerplateProps> = (
  props: EditBoilerplateProps,
) => {
  const {
    component,
    textResources,
    handleDataModelChange,
    handleTitleChange,
    handleDescriptionChange,
    language,
  } = props;
  return (
    <Grid item={true} xs={12}>
      {renderSelectDataModelBinding(
        component.dataModelBindings,
        handleDataModelChange,
        language,
      )}
      {renderSelectTextFromResources(
        'modal_properties_label_helper',
        handleTitleChange,
        textResources,
        language,
        component.textResourceBindings?.title,
        component.textResourceBindings?.title,
      )}
      {renderSelectTextFromResources(
        'modal_properties_description_helper',
        handleDescriptionChange,
        textResources,
        language,
        component.textResourceBindings?.description,
        component.textResourceBindings?.description,
      )}
    </Grid>
  );
};

export default EditBoilerplate;
