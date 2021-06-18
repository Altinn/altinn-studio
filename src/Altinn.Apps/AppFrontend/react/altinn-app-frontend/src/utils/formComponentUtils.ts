import { getLanguageFromKey, getParsedLanguageFromText, getTextResourceByKey } from 'altinn-shared/utils';
import { ILayoutComponent, ILayoutGroup, ISelectionComponentProps } from 'src/features/form/layout';
import { IDataModelBindings, IComponentValidations, ITextResource, ITextResourceBindings, IOption, IOptions, IValidations } from 'src/types';

export const isSimpleComponent = (dataModelBindings: any, type: string): boolean => {
  const simpleBinding = dataModelBindings ? dataModelBindings.simpleBinding : false;
  return simpleBinding && type !== 'FileUpload' && type !== 'Datepicker';
};

export const componentHasValidationMessages = (componentValidations) => {
  if (!componentValidations) {
    return false;
  }
  let hasMessages = false;
  Object.keys(componentValidations).forEach((key: string) => {
    if (componentValidations[key].errors.length > 0
      || componentValidations[key].warnings.length > 0) {
      hasMessages = true;
    }
  });
  return hasMessages;
};

export const getComponentValidations = (
  validations: IValidations,
  componentId: string,
  pageId: string,
) => {
  if (validations[pageId]) {
    return validations[pageId][componentId];
  }

  return undefined;
};

export const getFormDataForComponent = (formData: any, dataModelBindings: IDataModelBindings) => {
  if (!dataModelBindings) {
    return '';
  }

  if (dataModelBindings.simpleBinding) {
    const formDataVal = formData[dataModelBindings.simpleBinding];
    return formDataVal;
  }

  const formDataObj = {};
  Object.keys(dataModelBindings).forEach((key: any) => {
    const binding = dataModelBindings[key];
    if (formData[binding]) {
      formDataObj[key] = formData[binding];
    } else {
      formDataObj[key] = '';
    }
  });
  return formDataObj;
};

export const getDisplayFormDataForComponent = (
  formData: any,
  component: ILayoutComponent,
  textResources: ITextResource[],
  options: IOptions,
  multiChoice?: boolean,
) => {
  if (component.dataModelBindings.simpleBinding) {
    return getDisplayFormData(
      component.dataModelBindings.simpleBinding,
      component,
      formData,
      options,
      textResources,
      multiChoice,
    );
  }

  const formDataObj = {};
  Object.keys(component.dataModelBindings).forEach((key: any) => {
    const binding = component.dataModelBindings[key];
    formDataObj[key] = getDisplayFormData(binding, component, formData, options, textResources);
  });
  return formDataObj;
};

export const getDisplayFormData = (
  dataModelBinding: string,
  component: ILayoutComponent | ILayoutGroup,
  formData: any,
  options: IOptions,
  textResources: ITextResource[],
  asObject?: boolean,
) => {
  const formDataValue = formData[dataModelBinding] || '';
  if (formDataValue) {
    if (component.type === 'Dropdown' || component.type === 'RadioButtons') {
      const selectionComponent = component as ISelectionComponentProps;
      let label: string;
      if (selectionComponent?.options) {
        label = selectionComponent.options.find((option: IOption) => option.value === formDataValue)?.label;
      } else if (selectionComponent.optionsId) {
        label =
          options[selectionComponent.optionsId]?.find((option: IOption) => option.value === formDataValue)?.label;
      }
      return getTextResourceByKey(label, textResources) || '';
    }
    if (component.type === 'Checkboxes') {
      const selectionComponent = component as ISelectionComponentProps;
      let label: string = '';
      const data: string = formData[dataModelBinding];
      const split = data?.split(',');
      if (asObject) {
        const displayFormData = {};
        split?.forEach((value: string) => {
          const optionsForComponent = selectionComponent?.optionsId ? options[selectionComponent.optionsId]
            : selectionComponent.options;
          const textKey = optionsForComponent?.find((option: IOption) => option.value === value)?.label || '';
          displayFormData[value] = getTextResourceByKey(textKey, textResources) || '';
        });

        return displayFormData;
      }

      split?.forEach((value: string) => {
        if (selectionComponent?.options) {
          label += getTextResourceByKey(selectionComponent.options.find((option: IOption) => option.value === value)?.label, textResources) || '';
        } else if (selectionComponent.optionsId) {
          label += getTextResourceByKey(options[selectionComponent.optionsId]?.find((option: IOption) => option.value === value)?.label, textResources) || '';
        }
        if (split.indexOf(value) < (split.length - 1)) {
          label += ', ';
        }
      });
      return label;
    }
  }
  return formDataValue;
};

export const getFormDataForComponentInRepeatingGroup = (
  formData: any,
  component: ILayoutComponent | ILayoutGroup,
  index: number,
  groupDataModelBinding: string,
  textResources: ITextResource[],
  options: IOptions,
) => {
  if (component.type === 'Group' || component.type === 'Header' || component.type === 'Paragraph') {
    return '';
  }
  const dataModelBinding = (component.type === 'AddressComponent') ? component.dataModelBindings?.address : component.dataModelBindings?.simpleBinding;
  const replaced = dataModelBinding.replace(groupDataModelBinding, `${groupDataModelBinding}[${index}]`);
  return getDisplayFormData(replaced, component, formData, options, textResources);
};

export const isComponentValid = (validations: IComponentValidations): boolean => {
  if (!validations) {
    return true;
  }
  let isValid: boolean = true;

  Object.keys(validations).forEach((key: string) => {
    if (validations[key].errors.length > 0) {
      isValid = false;
    }
  });
  return isValid;
};

export const getTextResource = (resourceKey: string, textResources: ITextResource[]): any => {
  const textResource = textResources.find((resource: ITextResource) => resource.id === resourceKey);
  return textResource ? getParsedLanguageFromText(textResource.value) : resourceKey;
};

export function selectComponentTexts(textResources: ITextResource[], textResourceBindings: ITextResourceBindings) {
  const result: any = {};

  Object.keys(textResourceBindings).forEach((key) => {
    result[key] = getTextResource(textResourceBindings[key], textResources);
  });

  return result;
}

export function getFileUploadComponentValidations(validationError: string, language: any): IComponentValidations {
  const componentValidations: any = {
    simpleBinding: {
      errors: [],
      warnings: [],
    },
  };
  if (validationError === 'upload') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_upload', language),
    );
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_delete', language),
    );
  }
  return componentValidations;
}
