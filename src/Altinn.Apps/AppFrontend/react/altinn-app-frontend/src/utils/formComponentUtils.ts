import { ILanguage } from 'altinn-shared/types';
import {
  getLanguageFromKey,
  getParsedLanguageFromText,
  getTextResourceByKey,
} from 'altinn-shared/utils';
import React from 'react';
import { IFormData } from 'src/features/form/data/formDataReducer';
import {
  ILayoutComponent,
  ILayoutGroup,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import { IAttachment } from 'src/shared/resources/attachments';
import {
  IDataModelBindings,
  IComponentValidations,
  ITextResource,
  ITextResourceBindings,
  IOption,
  IOptions,
  IValidations,
} from 'src/types';
import { AsciiUnitSeparator } from './attachment';

export const componentValidationsHandledByGenericComponent = (
  dataModelBindings: any,
  type: string,
): boolean => {
  return (
    !!dataModelBindings?.simpleBinding &&
    type !== 'FileUpload' &&
    type !== 'Datepicker'
  );
};

export const componentHasValidationMessages = (componentValidations) => {
  if (!componentValidations) {
    return false;
  }
  let hasMessages = false;
  Object.keys(componentValidations).forEach((key: string) => {
    if (
      componentValidations[key].errors.length > 0 ||
      componentValidations[key].warnings.length > 0
    ) {
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

export interface IComponentFormData {
  simpleBinding?: string;
  [binding: string]: string;
}

export const getFormDataForComponent = (
  formData: IFormData,
  dataModelBindings: IDataModelBindings,
) => {
  if (!dataModelBindings) {
    return {} as IComponentFormData;
  }

  const formDataObj:IComponentFormData = {};
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
    formDataObj[key] = getDisplayFormData(
      binding,
      component,
      formData,
      options,
      textResources,
    );
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
        label = selectionComponent.options.find(
          (option: IOption) => option.value === formDataValue,
        )?.label;
      } else if (selectionComponent.optionsId) {
        label = options[selectionComponent.optionsId]?.find(
          (option: IOption) => option.value === formDataValue,
        )?.label;
      }
      return getTextResourceByKey(label, textResources) || '';
    }
    if (component.type === 'Checkboxes') {
      const selectionComponent = component as ISelectionComponentProps;
      let label = '';
      const data: string = formData[dataModelBinding];
      const split = data?.split(',');
      if (asObject) {
        const displayFormData = {};
        split?.forEach((value: string) => {
          const optionsForComponent = selectionComponent?.optionsId
            ? options[selectionComponent.optionsId]
            : selectionComponent.options;
          const textKey =
            optionsForComponent?.find(
              (option: IOption) => option.value === value,
            )?.label || '';
          displayFormData[value] =
            getTextResourceByKey(textKey, textResources) || '';
        });

        return displayFormData;
      }

      split?.forEach((value: string) => {
        if (selectionComponent?.options) {
          label +=
            getTextResourceByKey(
              selectionComponent.options.find(
                (option: IOption) => option.value === value,
              )?.label,
              textResources,
            ) || '';
        } else if (selectionComponent.optionsId) {
          label +=
            getTextResourceByKey(
              options[selectionComponent.optionsId]?.find(
                (option: IOption) => option.value === value,
              )?.label,
              textResources,
            ) || '';
        }
        if (split.indexOf(value) < split.length - 1) {
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
  if (
    component.type === 'Group' ||
    component.type === 'Header' ||
    component.type === 'Paragraph' ||
    component.type === 'Image' ||
    component.type === 'InstantiationButton'
  ) {
    return '';
  }
  const dataModelBinding =
    component.type === 'AddressComponent'
      ? component.dataModelBindings?.address
      : component.dataModelBindings?.simpleBinding;
  const replaced = dataModelBinding.replace(
    groupDataModelBinding,
    `${groupDataModelBinding}[${index}]`,
  );
  return getDisplayFormData(
    replaced,
    component,
    formData,
    options,
    textResources,
  );
};

export const isComponentValid = (
  validations: IComponentValidations,
): boolean => {
  if (!validations) {
    return true;
  }
  let isValid = true;

  Object.keys(validations).forEach((key: string) => {
    if (validations[key].errors.length > 0) {
      isValid = false;
    }
  });
  return isValid;
};

export const getTextResource = (
  resourceKey: string,
  textResources: ITextResource[],
): React.ReactNode => {
  const textResource = textResources.find(
    (resource: ITextResource) => resource.id === resourceKey,
  );
  return textResource
    ? getParsedLanguageFromText(textResource.value)
    : resourceKey;
};

export function selectComponentTexts(
  textResources: ITextResource[],
  textResourceBindings: ITextResourceBindings,
) {
  const result: {[textResourceKey: string]: React.ReactNode} = {};

  Object.keys(textResourceBindings).forEach((key) => {
    result[key] = getTextResource(textResourceBindings[key], textResources);
  });

  return result;
}

export function getFileUploadComponentValidations(
  validationError: string,
  language: ILanguage,
  attachmentId: string = undefined
): IComponentValidations {
  const componentValidations: any = {
    simpleBinding: {
      errors: [],
      warnings: [],
    },
  };
  if (validationError === 'upload') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey(
        'form_filler.file_uploader_validation_error_upload',
        language,
      ),
    );
  } else if (validationError === 'update') {
    if (attachmentId === undefined || attachmentId === '') {
      componentValidations.simpleBinding.errors.push(
        getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    } else {
      componentValidations.simpleBinding.errors.push( // If validation has attachmentId, add to start of message and seperate using ASCII Universal Seperator
        attachmentId + AsciiUnitSeparator + getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    }
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey(
        'form_filler.file_uploader_validation_error_delete',
        language,
      ),
    );
  }
  return componentValidations;
}

export function getFileUploadWithTagComponentValidations(
  validationMessages: IComponentValidations,
  validationState: Array<{ id: string, message: string }>
) : Array<{ id: string, message: string }> {
  const result: Array<{ id: string, message: string }> = [];
  validationMessages = JSON.parse(JSON.stringify(validationMessages || {}));
  if (!validationMessages || !validationMessages.simpleBinding) {
    validationMessages = {
      simpleBinding: {
        errors: [],
        warnings: [],
      }
    };
  }
  if (validationMessages.simpleBinding !== undefined && validationMessages.simpleBinding.errors.length > 0) {
    parseFileUploadComponentWithTagValidationObject(validationMessages.simpleBinding.errors as string[]).forEach((validation) => {
      result.push(validation);
    });
  }
  validationState.forEach((validation) => {
    result.push(validation);
  });
  return result;
}

export const parseFileUploadComponentWithTagValidationObject = (validationArray: string[]): Array<{ id: string, message: string }> => {
  if (validationArray === undefined || validationArray.length === 0) {
    return [];
  }
  const obj: Array<{ id: string, message: string }> = [];
  validationArray.forEach((validation) => {
    const val = validation.toString().split(AsciiUnitSeparator);
    if (val.length === 2) {
      obj.push({ id: val[0], message: val[1] });
    } else {
      obj.push({ id: '', message: validation });
    }
  });
  return obj;
};

export const isAttachmentError = (error: { id: string, message: string }): boolean => {
  return error.id ? true : false
};

export const isNotAttachmentError = (error: { id: string, message: string }): boolean => {
  return !error.id;
};

export const atleastOneTagExists = (
  attachments: IAttachment[]
): boolean => {
  const totalTagCount: number = attachments
    .map((attachment: IAttachment) => (attachment.tags?.length ? attachment.tags.length : 0))
    .reduce((total, current) => total + current, 0);

  return totalTagCount !== undefined && totalTagCount >= 1;
};
