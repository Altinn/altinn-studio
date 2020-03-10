import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';
import { IFormData } from '../features/form/data/formDataReducer';
import { ILayout, ILayoutComponent } from '../features/form/layout/';
import { IValidationIssue, Severity } from '../types';
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
  hiddenFields: string[],
) {
  const validations: any = {};
  formLayout.forEach((component: any) => {
    if (!hiddenFields.includes(component.id) && component.required) {
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
  hiddenFields: string[],
) {
  const validations: any = {};
  const fieldKey = 'simpleBinding';
  formLayout.forEach((component: any) => {
    if (!hiddenFields.includes(component.id)) {
      if (component.type === 'FileUpload') {
        if (!attachmentsValid(attachments, component)) {
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

function attachmentsValid(attachments: any, component: any): boolean {
  return (
    component.minNumberOfAttachments === 0 ||
    (attachments &&
      attachments[component.id] &&
      attachments[component.id].length >= component.minNumberOfAttachments)
  );
}

/*
  Validates formData for a single component, returns a IComponentValidations object
*/
export function validateComponentFormData(
  formData: any,
  dataModelFieldElement: IDataModelFieldElement,
  component: ILayoutComponent,
  language: any,
  existingValidationErrors?: IComponentValidations,
): IComponentValidations {
  const validationErrors: string[] = [];
  const fieldKey = Object.keys(component.dataModelBindings).find((binding: string) =>
    component.dataModelBindings[binding] === dataModelFieldElement.dataBindingName);

  const componentValidations: IComponentValidations = !existingValidationErrors ?
    {
      [fieldKey]: {
        errors: [],
        warnings: [],
      },
    } : existingValidationErrors;

  Object.keys(dataModelFieldElement.restrictions).forEach((key) => {
    const validationSuccess = runValidation(key, dataModelFieldElement.restrictions[key], formData);
    if (!validationSuccess) {
      if (dataModelFieldElement.restrictions[key].errortText) {
        validationErrors.push(
          dataModelFieldElement.restrictions[key].errortText,
        );
      } else {
        validationErrors.push(
          getParsedLanguageFromKey(
            `validation_errors.${key}`,
            language,
            [dataModelFieldElement.restrictions[key].value],
          ),
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

  if (!componentValidations[fieldKey] || (!existingValidationErrors && validationErrors.length === 0)) {
    return null;
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
    const dataModelFieldElement = dataModelFieldElements.find((e) => e.dataBindingName === dataBindingName);
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
    if (componentValidations === null) {
      return;
    }
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
export function canFormBeSaved(validations: IValidations, apiMode?: string): boolean {
  if (!validations || apiMode !== "Complete") {
    return true;
  }
  const layoutCanBeSaved = Object.keys(validations).every((componentId: string) => {
    const componentValidations: IComponentValidations = validations[componentId];
    if (componentValidations === null) {
      return true;
    }
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

/* Function to map the new data element validations to our internal redux structure*/
export function mapDataElementValidationToRedux(validations: IValidationIssue[], layout: ILayout) {
  const validationResult: IValidations = {};
  if (!validations) {
    return validationResult;
  }
  validations.forEach((validation) => {
    // for each validation, map to correct component and field key
    const componentValidations: IComponentValidations = {};
    const component = layout.find((layoutElement) => {
      const componentCandidate = layoutElement as ILayoutComponent;
      let found = false;

      if (validation.field === componentCandidate.id) {
        found = true;
        addValidation(componentValidations, validation, 'simpleBinding');
      } else {
        Object.keys(componentCandidate.dataModelBindings).forEach((dataModelBindingKey) => {
          // tslint:disable-next-line: max-line-length
          if (validation.field && componentCandidate.dataModelBindings[dataModelBindingKey].toLowerCase() === validation.field.toLowerCase()) {
            found = true;
            addValidation(componentValidations, validation, dataModelBindingKey);
          }
        });
      }

      return found;
    });
    if (component) {
      // we have found a matching component
      if (!validationResult[component.id]) {
        validationResult[component.id] = componentValidations;
      } else {
        const currentValidations = validationResult[component.id];
        Object.keys(componentValidations).forEach((key) => {
          if (!currentValidations[key]) {
            currentValidations[key] = componentValidations[key];
          } else {
            currentValidations[key].errors = currentValidations[key].errors.concat(componentValidations[key].errors);
            // tslint:disable-next-line: max-line-length
            currentValidations[key].warnings = currentValidations[key].warnings.concat(componentValidations[key].warnings);
          }
        });
        validationResult[component.id] = currentValidations;
      }
    } else {
      // unmapped error
      if (!validationResult.unmapped) {
        validationResult.unmapped = {};
      }
      if (!validationResult.unmapped[validation.field]) {
        validationResult.unmapped[validation.field] = {errors: [], warnings: []};
      }
      if (validation.severity === Severity.Error) {
        validationResult.unmapped[validation.field].errors.push(validation.description);
      } else {
        validationResult.unmapped[validation.field].warnings.push(validation.description);
      }
    }
  });

  return validationResult;
}

function addValidation(componentValidations: IComponentValidations, validation: IValidationIssue, dataModelBindingKey: string) {
  if (!componentValidations[dataModelBindingKey]) {
    componentValidations[dataModelBindingKey] = {errors: [], warnings: []};
  }
  if (validation.severity === Severity.Error) {
    componentValidations[dataModelBindingKey].errors.push(validation.description);
  } else {
    componentValidations[dataModelBindingKey].warnings.push(validation.description);
  }
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
    return validationFunctions[validationFunction](formFieldValue, validationTest.value);
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
