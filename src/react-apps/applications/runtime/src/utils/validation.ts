import { IFormData } from '../features/form/data/reducer';
import { ILayoutComponent, ILayoutContainer } from '../features/form/layout/types';
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
  formData: IFormData,
  dataModelFieldElement: IDataModelFieldElement,
  layoutModelElement: ILayoutComponent,
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
  if (
    (dataModelFieldElement.MinOccurs === null || dataModelFieldElement.MinOccurs === 1) ||
    (layoutModelElement.required && formData.length)
  ) {
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
  formData: IFormData,
  dataModelFieldElements: IDataModelFieldElement[],
  layout: [ILayoutComponent | ILayoutContainer],
): IValidationResults {
  const validationErrors: string[] = [];
  const componentValidations: IComponentValidations = {};
  const result: IValidationResults = {};
  Object.keys(formData).forEach((formDataKey) => {
    // Get data model element
    const dataBindingName = getKeyWithoutIndex(formDataKey);
    const dataModelFieldElement = dataModelFieldElements.find((e) => e.DataBindingName === dataBindingName);
    if (!dataModelFieldElement) {
      return;
    }
    let dataModelFieldKey: string = null;
    let connectedComponent: ILayoutComponent = null;
    for (const layoutElement in layout) {
      if (!layoutElement) {
        continue;
      }
      const component = layoutElement as unknown as ILayoutComponent;
      if (!component.dataModelBindings) {
        continue;
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
    }
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

    if (connectedComponent && connectedComponent.required) {
      if (formData[formDataKey].length === 0) {
        validationErrors.push('Field is required');
      }
    }

    if (validationErrors.length > 0) {
      if (!componentValidations[dataModelFieldKey]) {
        componentValidations[dataModelFieldKey] = {
          errors: [],
          warnings: [],
        };
      }
      componentValidations[dataModelFieldKey].errors = validationErrors;
      result[connectedComponent.id] = componentValidations;
    }
  });
  return result;
}

export function mapApiValidationResultToLayout(
  apiValidationResult: any, layout: [ILayoutComponent | ILayoutContainer]): IValidationResults {
  if (!apiValidationResult) {
    return {};
  }
  return mapValidations(apiValidationResult.messages, layout);
}

export function mapValidations(
  validations: any, layout: [ILayoutComponent | ILayoutContainer]): IValidationResults {
  const validationResult: IValidationResults = {};
  if (!validations) {
    return validationResult;
  }
  let match = false;
  Object.keys(validations).forEach((validationKey) => {
    const componentValidation: IComponentValidations = {};
    const component = layout.find((layoutElement) => {
      if (layoutElement.type !== 'COMPONENT') {
        return false;
      }
      const componentCandidate = layoutElement as unknown as ILayoutComponent;
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
