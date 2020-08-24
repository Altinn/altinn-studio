import { getLanguageFromKey } from 'altinn-shared/utils';
import Ajv from 'ajv';
import { JsonPointer } from 'json-ptr';
import { IComponentValidations, IValidations, IValidationResult, ISchemaValidator } from 'src/types';

export function createValidator(schema: any): ISchemaValidator {
  const ajv = new Ajv({ allErrors: true, coerceTypes: true });
  ajv.addFormat('year', /^[0-9]{4}$/);
  ajv.addSchema(schema, 'schema');
  const rootKey = Object.keys(schema.properties)[0];
  const rootElementPath = schema.properties[rootKey].$ref;
  const rootPtr = JsonPointer.create(rootElementPath);
  const rootElement = rootPtr.get(schema);
  const schemaValidator: ISchemaValidator = {
    validator: ajv,
    schema,
    rootElement,
    rootElementPath,
  };
  return schemaValidator;
}

export const errorMessageKeys = {
  minimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  exclusiveMinimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  maximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  exclusiveMaximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  minLength: {
    textKey: 'minLength',
    paramKey: 'limit',
  },
  maxLength: {
    textKey: 'maxLength',
    paramKey: 'limit',
  },
  pattern: {
    textKey: 'pattern',
    paramKey: 'pattern',
  },
  format: {
    textKey: 'pattern',
    paramKey: 'format',
  },
  type: {
    textKey: 'pattern',
    paramKey: 'type',
  },
  required: {
    textKey: 'required',
    paramKey: 'limit',
  },
  enum: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  const: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  multipleOf: {
    textKey: 'multipleOf',
    paramKey: 'multipleOf',
  },
};

export function validateEmptyField(
  formData: any,
  component: any,
  validations: any,
  language: any,
  groupDataBinding?: string,
  index?: number,
) {
  const fieldKey = Object.keys(component.dataModelBindings)
    .find((binding: string) => component.dataModelBindings[binding]);
  let dataModelBindingKey = component.dataModelBindings[fieldKey];
  if (groupDataBinding) {
    dataModelBindingKey = dataModelBindingKey.replace(groupDataBinding, `${groupDataBinding}[${index}]`);
  }
  const value = formData[dataModelBindingKey];
  if (!value && fieldKey) {
    // eslint-disable-next-line no-param-reassign
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
    // eslint-disable-next-line no-param-reassign
    validations[component.id] = componentValidations;
  }
}

export function getSchemaPart(dataModelPath: string[], subSchema: any, mainSchema: any) {
  const dataModelRoot = dataModelPath[0];
  if (subSchema.properties && subSchema.properties[dataModelRoot] && dataModelPath && dataModelPath.length !== 0) {
    const localRootElement = subSchema.properties[dataModelRoot];
    if (localRootElement.$ref) {
      const childSchemaPtr = JsonPointer.create(localRootElement.$ref);
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    if (localRootElement.items && localRootElement.items.$ref) {
      const childSchemaPtr = JsonPointer.create(localRootElement.items.$ref);
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    return localRootElement;
  }

  if (subSchema.$ref) {
    const ptr = JsonPointer.create(subSchema.$ref);
    return getSchemaPart(dataModelPath.slice(1), ptr.get(mainSchema), mainSchema);
  }

  return subSchema;
}

export function processDataPath(path: string): string {
  let result = path.startsWith('.') ? path.slice(1) : path;
  result = result.replace(/']\['/g, '.').replace(/\['/g, '').replace(/']/g, '');
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
export function canFormBeSaved(validationResult: IValidationResult, apiMode?: string): boolean {
  if (validationResult && validationResult.invalidDataTypes) {
    return false;
  }

  const validations = validationResult?.validations;
  if (!validations || apiMode !== 'Complete') {
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
      }
      return true;
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

export function getIndex(dataModelBinding: string) {
  const start = dataModelBinding.indexOf('[');
  if (start > -1) {
    return dataModelBinding.substring(dataModelBinding.indexOf('[') + 1, dataModelBinding.indexOf(']'));
  }
  return null;
}
/**
 * gets unmapped errors from validations as string array
 * @param validations the validaitons
 */
export function getUnmappedErrors(validations: IValidations): string[] {
  const messages: string[] = [];
  if (!validations || !validations.unmapped) {
    return messages;
  }
  Object.keys(validations.unmapped).forEach((key: string) => {
    // eslint-disable-next-line no-unused-expressions
    validations.unmapped[key]?.errors?.forEach((message: string) => {
      messages.push(message);
    });
  });
  return messages;
}

/**
 * gets total number of components with mapped errors
 * @param validations the validaitons
 */
export function getNumberOfComponentsWithErrors(validations: IValidations): number {
  let numberOfComponents = 0;
  if (!validations) {
    return numberOfComponents;
  }

  Object.keys(validations).forEach((componentKey: string) => {
    if (componentKey !== 'unmapped') {
      const componentHasErrors = Object.keys(validations[componentKey] || {}).some((bindingKey: string) => {
        if (validations[componentKey][bindingKey].errors?.length > 0) {
          return true;
        }
        return false;
      });

      if (componentHasErrors) {
        numberOfComponents += 1;
      }
    }
  });

  return numberOfComponents;
}
