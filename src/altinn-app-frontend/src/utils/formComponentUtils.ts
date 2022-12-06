import type React from 'react';

import { formatNumericText } from '@altinn/altinn-design-system';

import { AsciiUnitSeparator } from 'src/utils/attachment';
import { getDateFormat } from 'src/utils/dateHelpers';
import { setMappingForRepeatingGroupComponent } from 'src/utils/formLayout';
import { getOptionLookupKey, getRelevantFormDataForOptionSource, setupSourceOptions } from 'src/utils/options';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IFormData } from 'src/features/form/data';
import type {
  IGridStyling,
  ILayoutComponent,
  ILayoutEntry,
  ILayoutGroup,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type { IAttachment, IAttachments } from 'src/shared/resources/attachments';
import type {
  IComponentValidations,
  IDataModelBindings,
  IOption,
  IOptions,
  IRepeatingGroups,
  ITextResource,
  ITextResourceBindings,
  IValidations,
} from 'src/types';

import {
  formatISOString,
  getLanguageFromKey,
  getParsedLanguageFromText,
  getTextResourceByKey,
} from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

export const componentValidationsHandledByGenericComponent = (
  dataModelBindings: IDataModelBindings | undefined,
  type: ILayoutEntry['type'],
): boolean => {
  return !!dataModelBindings?.simpleBinding && type !== 'FileUpload' && type !== 'FileUploadWithTag';
};

export const componentHasValidationMessages = (componentValidations: IComponentValidations | undefined) => {
  if (!componentValidations) {
    return false;
  }
  return Object.keys(componentValidations).some((key: string) => {
    const bindings = componentValidations[key] || {};
    return Object.keys(bindings).some((validationKey) => {
      const messages = bindings && bindings[validationKey];
      return messages && messages.length > 0;
    });
  });
};

export const getComponentValidations = (validations: IValidations, componentId: string, pageId: string) => {
  if (validations[pageId]) {
    return validations[pageId][componentId];
  }

  return undefined;
};

export interface IComponentFormData {
  [binding: string]: string | undefined;
}

export const getFormDataForComponent = (formData: IFormData, dataModelBindings: IDataModelBindings | undefined) => {
  if (!dataModelBindings) {
    return {} as IComponentFormData;
  }

  const formDataObj: IComponentFormData = {};
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
  formData: IFormData,
  attachments: IAttachments,
  component: ILayoutComponent,
  textResources: ITextResource[],
  options: IOptions,
  repeatingGroups: IRepeatingGroups | null,
  multiChoice?: boolean,
) => {
  if (!component.dataModelBindings) {
    return '';
  }

  if (component.dataModelBindings?.simpleBinding || component.dataModelBindings?.list) {
    return getDisplayFormData(
      component.dataModelBindings?.simpleBinding || component.dataModelBindings?.list,
      component,
      component.id,
      attachments,
      formData,
      options,
      textResources,
      repeatingGroups,
      multiChoice,
    );
  }

  const formDataObj = {};
  Object.keys(component.dataModelBindings).forEach((key: any) => {
    const binding = component.dataModelBindings && component.dataModelBindings[key];

    if (component.type == 'List' && component.bindingToShowInSummary !== binding) {
      return;
    }

    formDataObj[key] = getDisplayFormData(
      binding,
      component,
      component.id,
      attachments,
      formData,
      options,
      textResources,
      repeatingGroups,
    );
  });
  return formDataObj;
};

export const getDisplayFormData = (
  dataModelBinding: string | undefined,
  component: ILayoutComponent | ILayoutGroup,
  componentId: string,
  attachments: IAttachments,
  formData: any,
  options: IOptions,
  textResources: ITextResource[],
  repeatingGroups: IRepeatingGroups | null,
  asObject?: boolean,
) => {
  if (!dataModelBinding) {
    return '';
  }

  let formDataValue = formData[dataModelBinding] || '';
  if (component.dataModelBindings?.list) {
    formDataValue = Object.keys(formData)
      .filter((key) => key.startsWith(dataModelBinding))
      .map((key) => formData[key]);
  }

  if (formDataValue) {
    if (component.type === 'Dropdown' || component.type === 'RadioButtons' || component.type === 'Likert') {
      const selectionComponent = component as ISelectionComponentProps;
      let label: string | undefined;
      if (selectionComponent.optionsId) {
        label = options[
          getOptionLookupKey({
            id: selectionComponent.optionsId,
            mapping: selectionComponent.mapping,
          })
        ]?.options?.find((option: IOption) => option.value === formDataValue)?.label;
      } else if (selectionComponent.options) {
        label = selectionComponent.options.find((option: IOption) => option.value === formDataValue)?.label;
      } else if (selectionComponent.source) {
        const relevantTextResource = textResources.find((e) => e.id === selectionComponent.source?.label);
        const reduxOptions =
          relevantTextResource &&
          setupSourceOptions({
            source: selectionComponent.source,
            relevantTextResource,
            relevantFormData: getRelevantFormDataForOptionSource(formData, selectionComponent.source),
            repeatingGroups,
            dataSources: {
              dataModel: formData,
            },
          });
        label = reduxOptions?.find((option) => option.value === formDataValue)?.label;
      }

      if (!label) {
        return undefined;
      }

      return getTextResourceByKey(label, textResources) || formDataValue;
    }
    if (component.type === 'Checkboxes' || component.type === 'MultipleSelect') {
      const selectionComponent = component as ISelectionComponentProps;
      let label = '';
      const data: string = formData[dataModelBinding];
      const split = data?.split(',');
      if (asObject) {
        const displayFormData = {};
        split?.forEach((value: string) => {
          const key =
            selectionComponent.optionsId &&
            getOptionLookupKey({
              id: selectionComponent.optionsId,
              mapping: selectionComponent.mapping,
            });
          const optionsForComponent =
            selectionComponent?.optionsId && key ? options[key]?.options : selectionComponent.options;
          const textKey = optionsForComponent?.find((option: IOption) => option.value === value)?.label || '';
          displayFormData[value] = getTextResourceByKey(textKey, textResources) || formDataValue;
        });

        return displayFormData;
      }

      split?.forEach((value: string) => {
        if (selectionComponent?.options) {
          label +=
            getTextResourceByKey(
              selectionComponent.options?.find((option: IOption) => option.value === value)?.label,
              textResources,
            ) || '';
        } else if (selectionComponent.optionsId) {
          label +=
            getTextResourceByKey(
              options[
                getOptionLookupKey({
                  id: selectionComponent.optionsId,
                  mapping: selectionComponent.mapping,
                })
              ]?.options?.find((option: IOption) => option.value === value)?.label,
              textResources,
            ) || '';
        }
        if (split.indexOf(value) < split.length - 1) {
          label += ', ';
        }
      });
      return label;
    }
    if (component.type === 'FileUpload' || component.type === 'FileUploadWithTag') {
      if (Array.isArray(formDataValue) && !formDataValue.length) {
        return '';
      }
      const attachmentNamesList = (Array.isArray(formDataValue) ? formDataValue : [formDataValue])
        .map((uuid) => {
          const attachmentsForComponent = attachments[componentId];
          if (attachmentsForComponent) {
            const foundAttachment = attachmentsForComponent.find((a) => a.id === uuid);
            if (foundAttachment) {
              return foundAttachment.name;
            }
          }

          return '';
        })
        .filter((name) => name !== '');

      return attachmentNamesList.join(', ');
    }
    if (component.type === 'Input' && component.formatting?.number) {
      return formatNumericText(formDataValue, component.formatting.number);
    }
    if (component.type === 'DatePicker') {
      const dateFormat = getDateFormat(component.format);
      return formatISOString(formDataValue, dateFormat) ?? formDataValue;
    }
  }
  return formDataValue;
};

export const getFormDataForComponentInRepeatingGroup = (
  formData: IFormData,
  attachments: IAttachments,
  component: ILayoutComponent | ILayoutGroup,
  index: number,
  groupDataModelBinding: string | undefined,
  textResources: ITextResource[],
  options: IOptions,
  repeatingGroups: IRepeatingGroups | null,
) => {
  if (
    !component.dataModelBindings ||
    component.type === 'Group' ||
    component.type === 'Header' ||
    component.type === 'Paragraph' ||
    component.type === 'Image' ||
    component.type === 'InstantiationButton'
  ) {
    return '';
  }
  let dataModelBinding =
    component.type === 'AddressComponent'
      ? component.dataModelBindings?.address
      : component.dataModelBindings?.simpleBinding;
  if (
    (component.type === 'FileUpload' || component.type === 'FileUploadWithTag') &&
    component.dataModelBindings?.list
  ) {
    dataModelBinding = component.dataModelBindings.list;
  }

  if (!dataModelBinding || !groupDataModelBinding || !repeatingGroups) {
    return undefined;
  }

  const replaced = dataModelBinding.replace(groupDataModelBinding, `${groupDataModelBinding}[${index}]`);
  const componentId = `${component.id}-${index}`;

  let mapping;
  if ('mapping' in component) {
    mapping = setMappingForRepeatingGroupComponent(component.mapping, index);
  }

  const indexedComponent = {
    ...component,
    mapping,
    id: componentId,
  };

  return getDisplayFormData(
    replaced,
    indexedComponent,
    componentId,
    attachments,
    formData,
    options,
    textResources,
    repeatingGroups,
  );
};

export const isComponentValid = (validations: IComponentValidations): boolean => {
  if (!validations) {
    return true;
  }
  let isValid = true;

  Object.keys(validations).forEach((key: string) => {
    const errors = validations[key]?.errors;
    if (errors && errors.length > 0) {
      isValid = false;
    }
  });
  return isValid;
};

export const getTextResource = (resourceKey: string, textResources: ITextResource[]): React.ReactNode => {
  const textResourceValue = getTextResourceByKey(resourceKey, textResources);
  if (textResourceValue === resourceKey) {
    // No match in text resources
    return resourceKey;
  }
  if (!textResourceValue) {
    return undefined;
  }

  return getParsedLanguageFromText(textResourceValue);
};

export function selectComponentTexts(
  textResources: ITextResource[],
  textResourceBindings: ITextResourceBindings | undefined,
) {
  const result: { [textResourceKey: string]: React.ReactNode } = {};

  if (textResourceBindings) {
    Object.keys(textResourceBindings).forEach((key) => {
      result[key] = getTextResource(textResourceBindings[key], textResources);
    });
  }
  return result;
}

export function getFileUploadComponentValidations(
  validationError: 'upload' | 'update' | 'delete' | null,
  language: ILanguage,
  attachmentId?: string,
): IComponentValidations {
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
  } else if (validationError === 'update') {
    if (attachmentId === undefined || attachmentId === '') {
      componentValidations.simpleBinding.errors.push(
        getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    } else {
      componentValidations.simpleBinding.errors.push(
        // If validation has attachmentId, add to start of message and seperate using ASCII Universal Seperator
        attachmentId +
          AsciiUnitSeparator +
          getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    }
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_delete', language),
    );
  }
  return componentValidations;
}

export function getFileUploadWithTagComponentValidations(
  validationMessages: IComponentValidations | undefined,
  validationState: Array<{ id: string; message: string }>,
): Array<{ id: string; message: string }> {
  const result: Array<{ id: string; message: string }> = [];
  validationMessages = validationMessages && JSON.parse(JSON.stringify(validationMessages));

  if (!validationMessages || !validationMessages.simpleBinding) {
    validationMessages = {
      simpleBinding: {
        errors: [],
        warnings: [],
      },
    };
  }
  if (
    validationMessages.simpleBinding !== undefined &&
    validationMessages.simpleBinding.errors &&
    validationMessages.simpleBinding.errors.length > 0
  ) {
    parseFileUploadComponentWithTagValidationObject(validationMessages.simpleBinding.errors as string[]).forEach(
      (validation) => {
        result.push(validation);
      },
    );
  }
  validationState.forEach((validation) => {
    result.push(validation);
  });
  return result;
}

export const parseFileUploadComponentWithTagValidationObject = (
  validationArray: string[],
): Array<{ id: string; message: string }> => {
  if (validationArray === undefined || validationArray.length === 0) {
    return [];
  }
  const obj: Array<{ id: string; message: string }> = [];
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

export const isAttachmentError = (error: { id: string | null; message: string }): boolean => !!error.id;

export const isNotAttachmentError = (error: { id: string | null; message: string }): boolean => {
  return !error.id;
};

export const atleastOneTagExists = (attachments: IAttachment[]): boolean => {
  const totalTagCount: number = attachments
    .map((attachment: IAttachment) => (attachment.tags?.length ? attachment.tags.length : 0))
    .reduce((total, current) => total + current, 0);

  return totalTagCount !== undefined && totalTagCount >= 1;
};

export function getFieldName(
  textResourceBindings: ITextResourceBindings | undefined,
  textResources: ITextResource[],
  language: ILanguage,
  fieldKey?: string,
): string | undefined {
  if (fieldKey) {
    return smartLowerCaseFirst(
      getTextFromAppOrDefault(`form_filler.${fieldKey}`, textResources, language, undefined, true),
    );
  }

  if (textResourceBindings?.shortName) {
    return getTextResourceByKey(textResourceBindings.shortName, textResources);
  }

  if (textResourceBindings?.title) {
    return smartLowerCaseFirst(getTextResourceByKey(textResourceBindings.title, textResources));
  }

  return getLanguageFromKey('validation.generic_field', language);
}

/**
 * Un-uppercase the first letter of a string
 */
export function lowerCaseFirst(text: string, firstLetterIndex = 0): string {
  if (firstLetterIndex > 0) {
    return (
      text.substring(0, firstLetterIndex) + text[firstLetterIndex].toLowerCase() + text.substring(firstLetterIndex + 1)
    );
  }
  return text[firstLetterIndex].toLowerCase() + text.substring(1);
}

/**
 * Un-uppercase the first letter of a string, but be smart about it (avoiding it when the string is an
 * uppercase abbreviation, etc).
 */
export function smartLowerCaseFirst(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const uc = text.toUpperCase();
  const lc = text.toLowerCase();

  let letters = 0;
  let firstLetterIdx = 0;
  for (let i = 0; i < text.length; i++) {
    if (uc[i] === lc[i]) {
      // This is not a letter, or could not be case-converted, skip it
      continue;
    }
    letters++;

    if (letters === 1) {
      if (text[i] === lc[i]) {
        // First letter is lower case already, return early
        return text;
      }

      firstLetterIdx = i;
      continue;
    }

    if (text[i] !== lc[i]) {
      return text;
    }

    if (letters >= 5) {
      // We've seen enough, looks like normal text with an uppercase first letter
      return lowerCaseFirst(text, firstLetterIdx);
    }
  }

  return lowerCaseFirst(text, firstLetterIdx);
}

export const gridBreakpoints = (grid?: IGridStyling) => {
  const { xs, sm, md, lg, xl } = grid || {};
  return {
    xs: xs || 12,
    ...(sm && { sm }),
    ...(md && { md }),
    ...(lg && { lg }),
    ...(xl && { xl }),
  };
};
