import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { IFormData } from '../features/form/data/reducer';
import { ILayout, ILayoutComponent } from '../features/form/layout/';
import { IComponentValidations, IDataModelFieldElement, IValidations } from '../types/global';
import { getKeyWithoutIndex } from './databindings';

export function min(value: number, test: number): boolean {
  test = Number(test);
  return value >= test;
}

export function max(value: number, test: number): boolean {
  test = Number(test);
  return value <= test;
}

export function minLength(value: string, test: number): boolean {
  test = Number(test);
  return value.length >= test;
}

export function maxLength(value: string, test: number): boolean {
  test = Number(test);
  return value.length <= test;
}

export function length(value: string, test: number): boolean {
  test = Number(test);
  return value.length === test;
}

export function pattern(value: string, test: string): boolean {
  const regex = `^${test}$`;
  const result = value.match(regex);
  return result && result.length > 0;
}

const validationFunctions: any = {
  min,
  max,
  minLength,
  maxLength,
  length,
  pattern,
};

/*
  Fetches validations for fields without data
*/
export function validateEmptyFields(
  formData: any,
  formLayout: any,
  language: any,
) {
  const validations: any = {};
  formLayout.forEach((component: any) => {
    if (!component.hidden && component.required) {
      const fieldKey = Object.keys(component.dataModelBindings).find((binding: string) =>
        component.dataModelBindings[binding]);
      const value = formData[component.dataModelBindings[fieldKey]];
      if (!value && fieldKey) {
        validations[component.id] = {};
        const componentValidations: IComponentValidations = {
          [fieldKey]: {
            errors: [],
            warnings: [],
          },
        };
        componentValidations[fieldKey].errors.push(
          getLanguageFromKey('form_filler.error_required', language),
        );
        validations[component.id] = componentValidations;
      }
    }
  });
  return validations;
}

/*
  Fetches component spesific validations
*/
export function validateFormComponents(
  attachments: any,
  formLayout: any,
  language: any,
) {
  const validations: any = {};
  const numberOfAttachments = attachments ? Object.keys(attachments).length : 0;
  const fieldKey = 'simpleBinding';
  formLayout.forEach((component: any) => {
    if (!component.hidden) {
      if (component.type === 'FileUpload') {
        if (component.minNumberOfAttachments > 0 && numberOfAttachments < 1 ||
          attachments[component.id].length < component.minNumberOfAttachments) {
          validations[component.id] = {};
          const componentValidations: IComponentValidations = {
            [fieldKey]: {
              errors: [],
              warnings: [],
            },
          };
          componentValidations[fieldKey].errors.push(
            getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_1', language) + ' ' +
            component.minNumberOfAttachments + ' ' +
            getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_2', language),
          );
          validations[component.id] = componentValidations;
        }
      }
    }
  });
  return validations;
}

/*
  Validates formData for a single component, returns a IComponentValidations object
*/
export function validateComponentFormData(
  formData: any,
  dataModelFieldElement: IDataModelFieldElement,
  component: ILayoutComponent,
  language: any,
): IComponentValidations {
  const validationErrors: string[] = [];
  const fieldKey = Object.keys(component.dataModelBindings).find((binding: string) =>
    component.dataModelBindings[binding] === dataModelFieldElement.DataBindingName);
  const componentValidations: IComponentValidations = {
    [fieldKey]: {
      errors: [],
      warnings: [],
    },
  };
  Object.keys(dataModelFieldElement.Restrictions).forEach((key) => {
    const validationSuccess = runValidation(key, dataModelFieldElement.Restrictions[key], formData);
    if (!validationSuccess) {
      if (dataModelFieldElement.Restrictions[key].ErrortText) {
        validationErrors.push(
          dataModelFieldElement.Restrictions[key].ErrortText,
        );
      } else {
        validationErrors.push(
          `${key}: ${dataModelFieldElement.Restrictions[key].Value}`,
        );
      }
    }
  });
  if (component.required) {
    if (!formData) {
      validationErrors.push(
        getLanguageFromKey('form_filler.error_required', language),
      );
    }
  }
  componentValidations[fieldKey].errors = validationErrors;
  return componentValidations;
}

/*
  Validates the entire formData and returns an IValidations object with validations mapped for all components
*/
export function validateFormData(
  formData: IFormData,
  dataModelFieldElements: IDataModelFieldElement[],
  layout: ILayout,
  language: any,
): IValidations {
  const result: IValidations = {};
  Object.keys(formData).forEach((formDataKey) => {
    const dataBindingName = getKeyWithoutIndex(formDataKey);
    const dataModelFieldElement = dataModelFieldElements.find((e) => e.DataBindingName === dataBindingName);
    if (!dataModelFieldElement) {
      return;
    }
    let dataModelFieldKey: string = null;
    let connectedComponent: ILayoutComponent = null;
    layout.forEach((layoutElement) => {
      const component = layoutElement as unknown as ILayoutComponent;
      if (!component.dataModelBindings) {
        return;
      }
      // Get form component and field connected to data model element
      for (const dataModelBindingKey in component.dataModelBindings) {
        if (!dataModelBindingKey) {
          continue;
        }
        if (component.dataModelBindings[dataModelBindingKey] === dataBindingName) {
          dataModelFieldKey = dataModelBindingKey;
          connectedComponent = component;
          return;
        }
      }
    });

    if (dataModelFieldKey && connectedComponent) {
      const componentValidations =
        validateComponentFormData(formData[formDataKey], dataModelFieldElement, connectedComponent,
          language);
      result[connectedComponent.id] = componentValidations;
    }
    dataModelFieldKey = null;
    connectedComponent = null;
  });
  return result;
}

/*
* Gets the total number of validation errors
*/
export function getErrorCount(validations: IValidations) {
  let count = 0;
  if (!validations) {
    return count;
  }
  Object.keys(validations).forEach((componentId: string) => {
    const componentValidations: IComponentValidations = validations[componentId];
    Object.keys(componentValidations).forEach((bindingKey: string) => {
      const componentErrors = componentValidations[bindingKey].errors;
      if (componentErrors) {
        count += componentErrors.length;
      }
    });
  });
  return count;
}

/*
* Checks if form can be saved. If it contains anything other than valid error messages it returns false
*/
export function canFormBeSaved(validations: IValidations) {
  if (!validations) {
    return true;
  }
  const layoutCanBeSaved = Object.keys(validations).every((componentId: string) => {
    const componentValidations: IComponentValidations = validations[componentId];
    const componentCanBeSaved = Object.keys(componentValidations).every((bindingKey: string) => {
      const componentErrors = componentValidations[bindingKey].errors;
      if (componentErrors) {
        return componentErrors.every((error) => (
          validErrorMessages.indexOf(error) > -1
        ));
      } else {
        return true;
      }
    });
    return componentCanBeSaved;
  });
  return layoutCanBeSaved;
}

/*
* Validation messages we allow before saving the form
*/
const validErrorMessages: string[] = [
  'Field is required',
];

/*
  Maps the API validation response to our redux format
*/
export function mapApiValidationsToRedux(
  validations: any, layout: ILayout): IValidations {
  const validationResult: IValidations = {};
  if (!validations) {
    return validationResult;
  }
  let match = false;
  Object.keys(validations).forEach((validationKey) => {
    const componentValidation: IComponentValidations = {};
    const component = layout.find((layoutElement) => {
      if (layoutElement.type.toLowerCase() === 'group') {
        return false;
      }
      const componentCandidate = layoutElement as unknown as ILayoutComponent;
      if (!componentCandidate.dataModelBindings) {
        return false;
      }
      Object.keys(componentCandidate.dataModelBindings).forEach((fieldKey) => {
        if (componentCandidate.dataModelBindings[fieldKey].toLowerCase() === validationKey.toLowerCase()) {
          match = true;
          componentValidation[fieldKey] = validations[validationKey];
          return;
        }
      });
      return match;
    });
    if (component) {
      if (validationResult[component.id]) {
        validationResult[component.id] = {
          ...validationResult[component.id],
          ...componentValidation,
        };
      } else {
        validationResult[component.id] = componentValidation;
      }
    } else {
      // If no component corresponds to validation key, add validation messages
      // as unmapped.
      if (validationResult.unmapped) {
        validationResult.unmapped[validationKey] = {
          ...validationResult.unmapped[validationKey],
          ...validations[validationKey],
        };
      } else {
        validationResult.unmapped = {
          [validationKey]: validations[validationKey],
        };
      }
    }
    match = false;
  });
  return validationResult;
}

function runValidation(
  validationFunction: string,
  validationTest: any,
  formFieldValue: any,
): boolean {
  // If value is empty, do not run validation
  if (!formFieldValue || formFieldValue.toString().length === 0) {
    return true;
  }

  // run relevant validation function
  try {
    return validationFunctions[validationFunction](formFieldValue, validationTest.Value);
  } catch (error) {
    if (error instanceof TypeError) {
      console.error(
        'Validation function ' + validationFunction + ' not implemented',
      );
      return true;
    }

    console.error('Validation function failed...', error);
    return false;
  }
}
