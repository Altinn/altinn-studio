import { IFormLayoutState } from '../reducers/formDesignerReducer/formLayoutReducer';
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

export function validateDataModel(
  formData: any,
  dataModelFieldElement: IDataModelFieldElement,
  layoutModelElement?: IFormComponent,
): IComponentValidations {
  const validationErrors: string[] = [];
  const fieldKey = Object.keys(layoutModelElement.dataModelBindings).find((binding: string) =>
    layoutModelElement.dataModelBindings[binding] === dataModelFieldElement.DataBindingName);
  const componentValidations: IComponentValidations = {
    [fieldKey]: {
      errors: [],
      warnings: [],
    },
  };

  // Loop through all restrictions for the data model element and validate
  Object.keys(dataModelFieldElement.Restrictions).forEach((key) => {
    if (
      !runValidation(key, dataModelFieldElement.Restrictions[key], formData)
    ) {
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
  if ((dataModelFieldElement.MinOccurs === null || dataModelFieldElement.MinOccurs === 1)
    || (layoutModelElement.required && formData.length)) {
    if (formData.length === 0) {
      validationErrors.push(
        `Field is required`,
      );
    }
  }

  componentValidations[fieldKey].errors = validationErrors;
  return componentValidations;
}

export function validateFormData(
  formData: any,
  dataModelFieldElements: IDataModelFieldElement[],
  layoutModelElements?: IFormDesignerComponent,
): any {
  const validationErrors: string[] = [];
  const componentValidations: IComponentValidations = {};
  const result: IValidationResults = {};
  Object.keys(formData).forEach((formDataKey, index) => {
    // Get data model element
    const dataBindingName = getKeyWithoutIndex(formDataKey);
    const dataModelFieldElement = dataModelFieldElements.find((e) => e.DataBindingName === dataBindingName);
    if (!dataModelFieldElement) {
      return;
    }

    // Get form component and field connected to data model element
    let fieldKey: string = null;
    const layoutModelKey = Object.keys(layoutModelElements).find(
      (e) => {
        if (!layoutModelElements[e].dataModelBindings) {
          return false;
        }
        for (const key in layoutModelElements[e].dataModelBindings) {
          if (!key) {
            continue;
          }
          if (layoutModelElements[e].dataModelBindings[key] === dataBindingName) {
            fieldKey = key;
            return true;
          }
        }
        return false;
      });

    const layoutModelElement: IFormComponent = layoutModelElements[layoutModelKey];

    Object.keys(dataModelFieldElement.Restrictions).forEach((restrictionKey) => {
      if (!runValidation(restrictionKey, dataModelFieldElement.Restrictions[restrictionKey], formData[formDataKey])) {
        if (dataModelFieldElement.Restrictions[restrictionKey].ErrortText) {
          validationErrors.push(dataModelFieldElement.Restrictions[restrictionKey].ErrortText);
        } else {
          validationErrors.push(
            `${restrictionKey}: ${dataModelFieldElement.Restrictions[restrictionKey].Value}`);
        }
      }
    });

    if (layoutModelElement && layoutModelElement.required) {
      if (formData[formDataKey].length === 0) {
        validationErrors.push('Field is required');
      }
    }

    if (validationErrors.length > 0) {
      if (!componentValidations[fieldKey]) {
        componentValidations[fieldKey] = {
          errors: [],
          warnings: [],
        };
      }
      componentValidations[fieldKey].errors = validationErrors;
      result[layoutModelKey] = componentValidations;
    }
  });

  return result;
}

export function mapApiValidationResultToLayout(
  apiValidationResult: any, layoutModel: IFormLayoutState): IValidationResults {
  if (!apiValidationResult) {
    return {};
  }
  const components = layoutModel.components;
  return mapValidations(apiValidationResult.messages, components);
}

function mapValidations(validations: any, layoutComponents: IFormDesignerComponent): IValidationResults {
  const validationResult: IValidationResults = {};
  if (!validations) {
    return validationResult;
  }

  // Loop through all validation keys
  Object.keys(validations).forEach((validationKey) => {
    const componentValidation: IComponentValidations = {};

    // Get component ID corresponding to validation key
    // if validation key represents a field in the data model
    const componentId: string = Object.keys(layoutComponents).find((layoutComponentId) => {
      const component = layoutComponents[layoutComponentId];
      let match = false;
      Object.keys(component.dataModelBindings).forEach((fieldKey) => {
        if (component.dataModelBindings[fieldKey].toLowerCase() === validationKey.toLowerCase()) {
          match = true;
          componentValidation[fieldKey] = validations[validationKey];
          return;
        }
      });
      return match;
    });

    if (componentId) {
      if (validationResult[componentId]) {
        validationResult[componentId] = {
          ...validationResult[componentId],
          ...componentValidation,
        };
      } else {
        validationResult[componentId] = componentValidation;
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
