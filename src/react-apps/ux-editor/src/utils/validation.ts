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

export function validateDataModel(
  formData: any,
  dataModelFieldElement: IDataModelFieldElement,
  layoutModelElement?: IFormComponent,
): any {
  const validationErrors: string[] = [];
  Object.keys(dataModelFieldElement.Restrictions).forEach(key => {
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
  return validationErrors;
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
    return eval(
      // Can we do this another way?
      `${validationFunction}('${formFieldValue}','${validationTest.Value}')`,
    );
  } catch (error) {
    if (error instanceof ReferenceError) {
      console.error(
        'Validation function ' + validationFunction + ' not implemented',
      );
      return true;
    }

    console.error('Validation function failed...', error);
    return false;
  }
}
