import { getLanguageFromKey, getParsedLanguageFromText } from 'altinn-shared/utils';
import { IDataModelBindings, IComponentValidations, ITextResource, ITextResourceBindings } from 'src/types';

export const isSimpleComponent = (dataModelBindings: any, type: string): boolean => {
  const simpleBinding = dataModelBindings.simpleBinding;
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

export const getFormDataForComponent = (formData: any, dataModelBindings: IDataModelBindings) => {
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
