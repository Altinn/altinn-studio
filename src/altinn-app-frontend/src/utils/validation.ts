import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';
import moment from 'moment';
import Ajv from 'ajv';
import { JsonPointer } from 'json-ptr';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../features/form/layout';
import { IValidationIssue, Severity } from '../types';
import { IComponentValidations, IValidations, IComponentBindingValidation, ITextResource, IValidationResult, ISchemaValidator, IRepeatingGroups } from '../types/global';
// eslint-disable-next-line import/no-cycle
import { DatePickerMinDateDefault, DatePickerMaxDateDefault, DatePickerFormatDefault } from '../components/base/DatepickerComponent';
import { getFormDataForComponent } from './formComponentUtils';
import { getTextResourceByKey } from './textResource';
import { getKeyWithoutIndex } from './databindings';
// eslint-disable-next-line import/no-cycle
import { matchLayoutComponent } from './layout';

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

/*
  Fetches validations for fields without data
*/
export function validateEmptyFields(
  formData: any,
  formLayout: ILayout,
  language: any,
  hiddenFields: string[],
  repeatingGroups: IRepeatingGroups,
) {
  const validations: any = {};
  let fieldsInGroup = [];
  const groupsToCheck = formLayout.filter((component) => component.type === 'group');
  groupsToCheck.forEach((groupComponent: ILayoutGroup) => {
    fieldsInGroup = fieldsInGroup.concat(groupComponent.children);
  });
  const fieldsToCheck = formLayout.filter((component) => {
    return (
      component.type !== 'group'
        && !hiddenFields.includes(component.id)
        && (component as ILayoutComponent).required
        && !fieldsInGroup.includes(component.id)
    );
  });
  fieldsToCheck.forEach((component: any) => {
    validateEmptyField(formData, component, validations, language);
  });

  groupsToCheck.forEach((group: ILayoutGroup) => {
    const componentsToCheck = formLayout.filter((component) => {
      return (component as ILayoutComponent).required && group.children.includes(component.id);
    });

    componentsToCheck.forEach((component) => {
      if (group.maxCount > 1) {
        const groupDataModelBinding = group.dataModelBindings.group;
        for (let i = 0; i <= repeatingGroups[group.id].count; i++) {
          const componentToCheck = {
            ...component,
            id: `${component.id}-${i}`,
          };
          validateEmptyField(formData, componentToCheck, validations, language, groupDataModelBinding, i);
        }
      } else {
        validateEmptyField(formData, component, validations, language);
      }
    });
  });

  return validations;
}

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

/*
  Fetches component spesific validations
*/
export function validateFormComponents(
  attachments: any,
  formLayout: any,
  formData: any,
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
            `${getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_1', language)} ${
              component.minNumberOfAttachments} ${
              getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_2', language)}`,
          );
          validations[component.id] = componentValidations;
        }
      }
      if (component.type === 'Datepicker') {
        let componentValidations: IComponentValidations = {};
        const date = getFormDataForComponent(formData, component.dataModelBindings);
        const datepickerValidations =
          validateDatepickerFormData(date, component.minDate, component.maxDate, component.format, language);
        componentValidations = {
          [fieldKey]: datepickerValidations,
        };
        validations[component.id] = componentValidations;
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
  Validates the datepicker form data, returns an array of error messages or empty array if no errors found
*/
export function validateDatepickerFormData(
  formData: string,
  minDate: string = DatePickerMinDateDefault,
  maxDate: string = DatePickerMaxDateDefault,
  format: string = DatePickerFormatDefault,
  language: any,
): IComponentBindingValidation {
  const validations: IComponentBindingValidation = { errors: [], warnings: [] };
  const messages: string[] = [];
  const date = formData ? moment(formData) : null;

  if (formData === null) {
    // is only set to NULL if the format is malformed. Is otherwise undefined or empty string
    validations.errors.push(getParsedLanguageFromKey('date_picker.invalid_date_message', language, [format]));
  }

  if (date && date.isBefore(minDate)) {
    messages.push(getLanguageFromKey('date_picker.min_date_exeeded', language));
  } else if (date && date.isAfter(maxDate)) {
    messages.push(getLanguageFromKey('date_picker.max_date_exeeded', language));
  }
  messages.forEach((message: string) => {
    validations.errors.push(message);
  });
  return validations;
}

/*
  Validates formData for a single component, returns a IComponentValidations object
*/
export function validateComponentFormData(
  formData: any,
  dataModelField: string,
  component: ILayoutComponent,
  language: any,
  schemaValidator: ISchemaValidator,
  existingValidationErrors?: IComponentValidations,
  componentIdWithIndex?: string,
): IValidationResult {
  const {
    validator,
    rootElement,
    schema,
  } = schemaValidator;
  const fieldKey = Object.keys(component.dataModelBindings).find(
    (binding: string) => component.dataModelBindings[binding] === dataModelField,
  );
  const dataModelPaths = dataModelField.split('.');
  const fieldSchema = getSchemaPart(dataModelPaths || [dataModelField], rootElement, schema);
  const valid = (!formData || formData === '') || validator.validate(fieldSchema, formData);

  const validationResult: IValidationResult = {
    validations: {
      [componentIdWithIndex || component.id]: {
        [fieldKey]: {
          errors: [],
          warnings: [],
        },
      },
    },
    invalidDataTypes: false,
  };

  if (!valid) {
    validator.errors.forEach((error) => {
      if (error.keyword === 'type' || error.keyword === 'format') {
        validationResult.invalidDataTypes = true;
      }
      let errorParams = error.params[errorMessageKeys[error.keyword].paramKey];
      if (Array.isArray(errorParams)) {
        errorParams = errorParams.join(', ');
      }
      const errorMessage = getParsedLanguageFromKey(
        `validation_errors.${errorMessageKeys[error.keyword].textKey}`,
        language,
        [errorParams],
      );
      mapToComponentValidations(
        null,
        dataModelField,
        errorMessage,
        validationResult.validations,
        { ...component, id: componentIdWithIndex || component.id },
      );
    });
  }

  if (component.required) {
    if (!formData || formData === '') {
      validationResult.validations[componentIdWithIndex || component.id][fieldKey].errors.push(
        getLanguageFromKey('form_filler.error_required', language),
      );
    }
  }

  if (existingValidationErrors || validationResult.validations[componentIdWithIndex
    || component.id][fieldKey].errors.length > 0) {
    return validationResult;
  }

  return null;
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

/*
  Validates the entire formData and returns an IValidations object with validations mapped for all components
*/
export function validateFormData(
  formData: any,
  layout: ILayout,
  schemaValidator: ISchemaValidator,
  language: any,
): IValidationResult {
  const { validator, rootElementPath } = schemaValidator;
  const valid = validator.validate(`schema${rootElementPath}`, formData);
  const result: IValidationResult = {
    validations: {},
    invalidDataTypes: false,
  };

  if (!valid) {
    validator.errors.forEach((error) => {
      if (error.keyword !== 'required') {
        if (error.keyword === 'type' || error.keyword === 'format') {
          result.invalidDataTypes = true;
        }

        let errorParams = error.params[errorMessageKeys[error.keyword].paramKey];
        if (Array.isArray(errorParams)) {
          errorParams = errorParams.join(', ');
        }
        const errorMessage = getParsedLanguageFromKey(
          `validation_errors.${errorMessageKeys[error.keyword].textKey}`,
          language,
          [errorParams],
        );

        const dataBindingName = processDataPath(error.dataPath);
        mapToComponentValidations(layout, dataBindingName, errorMessage, result.validations);
      }
    });
  }

  return result;
}

export function processDataPath(path: string): string {
  let result = path.startsWith('.') ? path.slice(1) : path;
  result = result.replace(/']\['/g, '.').replace(/\['/g, '').replace(/']/g, '');
  return result;
}

export function mapToComponentValidations(
  layout: ILayout,
  dataBindingName: string,
  errorMessage: string,
  validations: IValidations,
  validatedComponent?: ILayoutComponent | ILayoutGroup,
) {
  let dataModelFieldKey = validatedComponent ?
    (Object.keys((validatedComponent as ILayoutComponent).dataModelBindings).find((name) => {
      return (validatedComponent as ILayoutComponent).dataModelBindings[name] === dataBindingName;
    })) : null;

  const layoutComponent = validatedComponent || layout.find((c) => {
    const component = c as unknown as ILayoutComponent;
    if (component.dataModelBindings) {
      dataModelFieldKey = Object.keys(component.dataModelBindings).find((key) => {
        const dataBindingWithoutIndex = getKeyWithoutIndex(dataBindingName.toLowerCase());
        return key && component.dataModelBindings[key]
          && component.dataModelBindings[key].toLowerCase() === dataBindingWithoutIndex;
      });
    }
    return !!dataModelFieldKey;
  });

  if (!dataModelFieldKey) {
    return;
  }

  if (layoutComponent) {
    const index = getIndex(dataBindingName);
    const componentId = index ? `${layoutComponent.id}-${index}` : layoutComponent.id;
    if (validations[componentId]) {
      if (validations[componentId][dataModelFieldKey]) {
        if (validations[componentId][dataModelFieldKey].errors.includes(errorMessage)) {
          return;
        }
        validations[componentId][dataModelFieldKey].errors.push(errorMessage);
      } else {
        // eslint-disable-next-line no-param-reassign
        validations[componentId][dataModelFieldKey] = {
          errors: [errorMessage],
        };
      }
    } else {
      // eslint-disable-next-line no-param-reassign
      validations[componentId] = {
        [dataModelFieldKey]: {
          errors: [errorMessage],
        },
      };
    }
  }
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

/*
  Maps the API validation response to our redux format
*/
export function mapApiValidationsToRedux(
  validations: any, layout: ILayout,
): IValidations {
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
    } else if (validationResult.unmapped) {
      // If no component corresponds to validation key, add validation messages
      // as unmapped.
      validationResult.unmapped[validationKey] = {
        ...validationResult.unmapped[validationKey],
        ...validations[validationKey],
      };
    } else {
      validationResult.unmapped = {
        [validationKey]: validations[validationKey],
      };
    }
    match = false;
  });
  return validationResult;
}

/* Function to map the new data element validations to our internal redux structure */
export function mapDataElementValidationToRedux(
  validations: IValidationIssue[],
  layout: ILayout,
  textResources: ITextResource[],
) {
  const validationResult: IValidations = {};
  if (!validations) {
    return validationResult;
  }
  validations.forEach((validation) => {
    // for each validation, map to correct component and field key
    const componentValidations: IComponentValidations = {};
    let component;
    let componentId;
    if (layout) {
      component = layout.find((layoutElement) => {
        const componentCandidate = layoutElement as ILayoutComponent;
        let found = false;
        const match = matchLayoutComponent(validation.field, componentCandidate.id);
        if (validation.field && match && match.length > 0) {
          found = true;
          addValidation(componentValidations, validation, 'simpleBinding', textResources);
          componentId = validation.field;
        } else {
          let index: string;
          if (validation.field) {
            index = getIndex(validation.field);
          }
          Object.keys(componentCandidate.dataModelBindings).forEach((dataModelBindingKey) => {
            const fieldToCheck = getKeyWithoutIndex(validation.field.toLowerCase());
            // tslint:disable-next-line: max-line-length
            if (validation.field
              && componentCandidate.dataModelBindings[dataModelBindingKey].toLowerCase() === fieldToCheck) {
              found = true;
              componentId = index ? `${layoutElement.id}-${index}` : layoutElement.id;
              addValidation(componentValidations, validation, dataModelBindingKey, textResources);
            }
          });
        }

        return found;
      });
    }

    if (component) {
      // we have found a matching component
      if (!validationResult[componentId]) {
        validationResult[componentId] = componentValidations;
      } else {
        const currentValidations = validationResult[componentId];
        Object.keys(componentValidations).forEach((key) => {
          if (!currentValidations[key]) {
            currentValidations[key] = componentValidations[key];
          } else {
            currentValidations[key].errors = currentValidations[key].errors.concat(componentValidations[key].errors);
            // tslint:disable-next-line: max-line-length
            currentValidations[key].warnings = currentValidations[key].warnings
              .concat(componentValidations[key].warnings);
          }
        });
        validationResult[componentId] = currentValidations;
      }
    } else {
      // unmapped error
      if (!validationResult.unmapped) {
        validationResult.unmapped = {};
      }
      if (!validationResult.unmapped[validation.field]) {
        validationResult.unmapped[validation.field] = { errors: [], warnings: [] };
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

export function getIndex(dataModelBinding: string) {
  const start = dataModelBinding.indexOf('[');
  if (start > -1) {
    return dataModelBinding.substring(dataModelBinding.indexOf('[') + 1, dataModelBinding.indexOf(']'));
  }
  return null;
}

function addValidation(
  componentValidations: IComponentValidations,
  validation: IValidationIssue,
  dataModelBindingKey: string,
  textResources: ITextResource[],
) {
  if (!componentValidations[dataModelBindingKey]) {
    // eslint-disable-next-line no-param-reassign
    componentValidations[dataModelBindingKey] = { errors: [], warnings: [] };
  }
  if (validation.severity === Severity.Error) {
    componentValidations[dataModelBindingKey].errors.push(getTextResourceByKey(validation.description, textResources));
  } else {
    componentValidations[dataModelBindingKey].warnings
      .push(getTextResourceByKey(validation.description, textResources));
  }
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
