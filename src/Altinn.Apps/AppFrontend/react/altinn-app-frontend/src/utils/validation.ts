/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';
import moment from 'moment';
import Ajv from 'ajv';
import { IComponentValidations, IValidations, IComponentBindingValidation, ITextResource, IValidationResult, ISchemaValidator, IRepeatingGroups, ILayoutValidations } from 'src/types';
import { ILayouts, ILayoutComponent, ILayoutGroup, ILayout } from '../features/form/layout';
import { IValidationIssue, Severity } from '../types';
// eslint-disable-next-line import/no-cycle
import { DatePickerMinDateDefault, DatePickerMaxDateDefault, DatePickerFormatDefault } from '../components/base/DatepickerComponent';
import { getFormDataForComponent } from './formComponentUtils';
import { getTextResourceByKey } from './textResource';
import { getKeyWithoutIndex } from './databindings';
// eslint-disable-next-line import/no-cycle
import { matchLayoutComponent, setupGroupComponents } from './layout';
import { createRepeatingGroupComponents } from './formLayout';

const JsonPointer = require('jsonpointer');

export function createValidator(schema: any): ISchemaValidator {
  const ajv = new Ajv({ allErrors: true, coerceTypes: true });
  ajv.addFormat('year', /^[0-9]{4}$/);
  ajv.addFormat('year-month', /^[0-9]{4}-(0[1-9]|1[0-2])$/);
  ajv.addSchema(schema, 'schema');
  const rootKey = Object.keys(schema.properties)[0];
  const rootElementPath = schema.properties[rootKey].$ref;
  const rootPtr = JsonPointer.compile(rootElementPath.substr(1));
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

export function validateEmptyFields(
  formData: any,
  layouts: ILayouts,
  language: any,
  hiddenFields: string[],
  repeatingGroups: IRepeatingGroups,
) {
  const validations = {};
  Object.keys(layouts).forEach((id) => {
    const result = validateEmptyFieldsForLayout(formData, layouts[id], language, hiddenFields, repeatingGroups);
    validations[id] = result;
  });
  return validations;
}

/*
  Fetches validations for fields without data
*/
export function validateEmptyFieldsForLayout(
  formData: any,
  formLayout: ILayout,
  language: any,
  hiddenFields: string[],
  repeatingGroups: IRepeatingGroups,
) {
  const validations: any = {};
  let fieldsInGroup = [];
  const groupsToCheck = formLayout.filter((component) => component.type.toLowerCase() === 'group');
  groupsToCheck.forEach((groupComponent: ILayoutGroup) => {
    fieldsInGroup = fieldsInGroup.concat(groupComponent.children);
  });
  const fieldsToCheck = formLayout.filter((component) => {
    return (
      component.type.toLowerCase() !== 'group'
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
      return (component as ILayoutComponent).required && group.children?.indexOf(component.id) > -1;
    });

    componentsToCheck.forEach((component) => {
      if (group.maxCount > 1) {
        const parentGroup = getParentGroup(group, formLayout);
        if (parentGroup) {
          // If we have a parent group there can exist several instances of the child group.
          Object.keys(repeatingGroups).filter((key) => key.startsWith(group.id)).forEach((repeatingGroupId) => {
            const parentIndex = Number.parseInt(repeatingGroupId.charAt(repeatingGroupId.length - 1), 10);
            const parentDataBinding = parentGroup.dataModelBindings?.group;
            const indexedParentDataBinding = `${parentDataBinding}[${parentIndex}]`;
            const indexedGroupDataBinding = group.dataModelBindings?.group.replace(parentDataBinding, indexedParentDataBinding);
            const dataModelBindings = {};
            Object.keys(component.dataModelBindings).forEach((key) => {
              // eslint-disable-next-line no-param-reassign
              dataModelBindings[key] = component.dataModelBindings[key].replace(parentDataBinding, `${indexedParentDataBinding}`);
            });
            for (let i = 0; i <= repeatingGroups[repeatingGroupId]?.count; i++) {
              const componentToCheck = {
                ...component,
                id: `${component.id}-${parentIndex}-${i}`,
                dataModelBindings,
              };
              validateEmptyField(formData, componentToCheck, validations, language, indexedGroupDataBinding, i);
            }
          });
        } else {
          const groupDataModelBinding = group.dataModelBindings.group;
          for (let i = 0; i <= repeatingGroups[group.id]?.count; i++) {
            const componentToCheck = {
              ...component,
              id: `${component.id}-${i}`,
            };
            validateEmptyField(formData, componentToCheck, validations, language, groupDataModelBinding, i);
          }
        }
      } else {
        validateEmptyField(formData, component, validations, language);
      }
    });
  });

  return validations;
}

export function getParentGroup(group: ILayoutGroup, layout: ILayout): ILayoutGroup {
  if (!group || !layout) {
    return null;
  }
  return layout.find((element) => {
    if (element.id !== group.id && element.type === 'Group') {
      const parentGroupCandidate = element as ILayoutGroup;
      if (parentGroupCandidate.children?.indexOf(group.id) > -1) {
        return true;
      }
    }
    return false;
  }) as ILayoutGroup;
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

export function validateFormComponents(
  attachments: any,
  layouts: any,
  formData: any,
  language: any,
  hiddenFields: string[],
) {
  const validations: any = {};
  Object.keys(layouts).forEach((id) => {
    const result = validateFormComponentsForLayout(attachments, layouts[id], formData, language, hiddenFields);
    validations[id] = result;
  });

  return validations;
}

/*
  Fetches component spesific validations
*/
export function validateFormComponentsForLayout(
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
            `${getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_1', language)} ${component.minNumberOfAttachments} ${getLanguageFromKey('form_filler.file_uploader_validation_error_file_number_2', language)}`,
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
  layoutId: string,
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
      [layoutId]: {
        [componentIdWithIndex || component.id]: {
          [fieldKey]: {
            errors: [],
            warnings: [],
          },
        },
      },
    },
    invalidDataTypes: false,
  };

  if (!valid) {
    validator.errors.forEach((error) => {
      if (error.keyword === 'type' || error.keyword === 'format' || error.keyword === 'maximum') {
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
        layoutId,
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
      validationResult.validations[layoutId][componentIdWithIndex || component.id][fieldKey].errors.push(
        getLanguageFromKey('form_filler.error_required', language),
      );
    }
  }

  if (existingValidationErrors || validationResult.validations[layoutId][componentIdWithIndex
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
      const childSchemaPtr = JsonPointer.compile(localRootElement.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    if (localRootElement.items && localRootElement.items.$ref) {
      const childSchemaPtr = JsonPointer.compile(localRootElement.items.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    return localRootElement;
  }

  if (subSchema.allOf) {
    let tmpSchema: any = {};
    subSchema.allOf.forEach((element) => {
      tmpSchema = {
        ...tmpSchema,
        ...element,
      };
    });
    return getSchemaPart(dataModelPath, tmpSchema, mainSchema);
  }

  if (subSchema.$ref) {
    const ptr = JsonPointer.compile(subSchema.$ref.substr(1));
    return getSchemaPart(dataModelPath.slice(1), ptr.get(mainSchema), mainSchema);
  }

  return subSchema;
}

export function validateFormData(
  formData: any,
  layouts: ILayouts,
  schemaValidator: ISchemaValidator,
  language: any,
): IValidationResult {
  let validations: any = {};
  let invalidDataTypes: boolean = false;

  Object.keys(layouts).forEach((id) => {
    const result = validateFormDataForLayout(formData, layouts[id], id, schemaValidator, language);
    validations = result.validations;
    if (!invalidDataTypes) {
      invalidDataTypes = result.invalidDataTypes;
    }
  });

  return { validations, invalidDataTypes };
}

/*
  Validates the entire formData and returns an IValidations object with validations mapped for all components
*/
export function validateFormDataForLayout(
  formData: any,
  layout: ILayout,
  layoutKey: string,
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
        mapToComponentValidations(layoutKey, layout, dataBindingName, errorMessage, result.validations);
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
  layoutId: string,
  layout: ILayout,
  dataBindingName: string,
  errorMessage: string,
  validations: ILayoutValidations,
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
    if (!validations[layoutId]) {
      validations[layoutId] = {};
    }
    if (validations[layoutId][componentId]) {
      if (validations[layoutId][componentId][dataModelFieldKey]) {
        if (validations[layoutId][componentId][dataModelFieldKey].errors.includes(errorMessage)) {
          return;
        }
        validations[layoutId][componentId][dataModelFieldKey].errors.push(errorMessage);
      } else {
        // eslint-disable-next-line no-param-reassign
        validations[layoutId][componentId][dataModelFieldKey] = {
          errors: [errorMessage],
        };
      }
    } else {
      // eslint-disable-next-line no-param-reassign
      validations[layoutId][componentId] = {
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
  Object.keys(validations).forEach((layoutId: string) => {
    Object.keys(validations[layoutId])?.forEach((componentId: string) => {
      const componentValidations: IComponentValidations = validations[layoutId]?.[componentId];
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
  const canBeSaved = Object.keys(validations).every((layoutId: string) => {
    const layoutCanBeSaved = Object.keys(validations[layoutId])?.every((componentId: string) => {
      const componentValidations: IComponentValidations = validations[layoutId][componentId];
      if (componentValidations === null) {
        return true;
      }
      const componentCanBeSaved = Object.keys(componentValidations).every((bindingKey: string) => {
        const componentErrors = componentValidations[bindingKey].errors;
        return !componentErrors || componentErrors.length === 0;
      });
      return componentCanBeSaved;
    });
    return layoutCanBeSaved;
  });
  return canBeSaved;
}

/* Function to map the new data element validations to our internal redux structure */
export function mapDataElementValidationToRedux(
  validations: IValidationIssue[],
  layouts: ILayouts,
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
    let layoutId = Object.keys(layouts).find((id) => {
      const foundInLayout = layouts[id].find((c: ILayoutComponent) => {
        // Special handling for FileUpload component
        if (c.type === 'FileUpload') {
          return c.id === validation.field;
        }
        return Object.values(c.dataModelBindings).includes(validation.field);
      });
      return !!foundInLayout;
    });
    if (layoutId && layouts[layoutId]) {
      component = layouts[layoutId].find((layoutElement) => {
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

      if (!validationResult[layoutId]) {
        validationResult[layoutId] = {};
      }
      if (!validationResult[layoutId][componentId]) {
        validationResult[layoutId][componentId] = componentValidations;
      } else {
        const currentValidations = validationResult[layoutId][componentId];
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
        validationResult[layoutId][componentId] = currentValidations;
      }
    } else {
      // unmapped error
      if (!layoutId) {
        layoutId = 'unmapped';
      }

      if (!validationResult[layoutId]) {
        validationResult[layoutId] = {};
      }
      if (!validationResult[layoutId].unmapped) {
        validationResult[layoutId].unmapped = {};
      }
      if (!validationResult[layoutId].unmapped[validation.field]) {
        validationResult[layoutId].unmapped[validation.field] = { errors: [], warnings: [] };
      }
      if (validation.severity === Severity.Error) {
        validationResult[layoutId].unmapped[validation.field].errors.push(validation.description);
      } else {
        validationResult[layoutId].unmapped[validation.field].warnings.push(validation.description);
      }
    }
  });

  return validationResult;
}

/**
 * Returns index of a datamodelbinding. If it is part of a repeating group we return it on the form {group1-index}-{group2-index}-{groupN-index}
 * @param dataModelBinding the data model binding
 */
export function getIndex(dataModelBinding: string) {
  let start = dataModelBinding.indexOf('[');
  if (start > -1) {
    let index: string = '';
    while (start > -1) {
      index += dataModelBinding.substring(start + 1, start + 2);
      start = dataModelBinding.indexOf('[', start + 1);
      if (start > -1) {
        index += '-';
      }
    }
    return index;
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
  if (!validations) {
    return messages;
  }
  Object.keys(validations).forEach((layout: string) => {
    Object.keys(validations[layout]?.unmapped || {}).forEach((key: string) => {
      // eslint-disable-next-line no-unused-expressions
      validations[layout].unmapped[key]?.errors?.forEach((message: string) => {
        messages.push(message);
      });
    });
  });
  return messages;
}

/**
 * gets total number of components with mapped errors
 * @param validations the validations
 */
export function getNumberOfComponentsWithErrors(validations: IValidations): number {
  return getNumberOfComponentsWithValidationMessages(validations, Severity.Error);
}

/**
 * gets total number of components with mapped warnings
 * @param validations the validations
 */
export function getNumberOfComponentsWithWarnings(validations: IValidations): number {
  return getNumberOfComponentsWithValidationMessages(validations, Severity.Warning);
}

/**
 * gets total number of components with mapped validation message of the given type
 * @param validations the validations
 */
export function getNumberOfComponentsWithValidationMessages(validations: IValidations, severity: Severity): number {
  let numberOfComponents = 0;
  if (!validations) {
    return numberOfComponents;
  }

  Object.keys(validations).forEach((layout) => {
    Object.keys(validations[layout]).forEach((componentKey: string) => {
      if (componentKey !== 'unmapped') {
        const componentHasMessages = Object.keys(validations[layout][componentKey] || {}).some((bindingKey: string) => {
          if (severity === Severity.Error && validations[layout][componentKey][bindingKey].errors?.length > 0) {
            return true;
          }
          if (severity === Severity.Warning && validations[layout][componentKey][bindingKey].warnings?.length > 0) {
            return true;
          }
          return false;
        });
        if (componentHasMessages) {
          numberOfComponents += 1;
        }
      }
    });
  });

  return numberOfComponents;
}

/*
  Checks if a given component has any validation errors. Returns true/false.
*/
export function componentHasValidations(validations: IValidations, layoutKey: string, componentId: string): boolean {
  if (!validations || !componentId) {
    return false;
  }
  return Object.keys(validations[layoutKey]?.[componentId] || {})?.some((bindingKey: string) => {
    return (validations[layoutKey][componentId][bindingKey].errors?.length > 0);
  });
}

/*
  Checks if a given repeating group has any child components with errors.
*/
export function repeatingGroupHasValidations(
  group: ILayoutGroup,
  repeatingGroupComponents: Array<Array<ILayoutGroup | ILayoutComponent>>,
  validations: IValidations,
  currentView: string,
  repeatingGroups: IRepeatingGroups,
  layout: ILayout,
  hiddenFields?: string[],
): boolean {
  if (!group || !validations || !layout) {
    return false;
  }

  return repeatingGroupComponents.some((groupIndexArray: Array<ILayoutGroup | ILayoutComponent>, index: number) => {
    return groupIndexArray.some((element) => {
      if (element.type !== 'Group') {
        return componentHasValidations(validations, currentView, element.id);
      }
      const childGroup = element as ILayoutGroup;
      const childGroupCount = repeatingGroups[childGroup.id]?.count;
      const childGroupComponents = layout.filter((childElement) => childGroup.children?.indexOf(childElement.id) > -1);
      const renderComponents = setupGroupComponents(childGroupComponents, childGroup.dataModelBindings?.group, index);
      const deepCopyComponents = createRepeatingGroupComponents(childGroup, renderComponents, childGroupCount, hiddenFields);
      return repeatingGroupHasValidations(childGroup, deepCopyComponents, validations, currentView, repeatingGroups, layout, hiddenFields);
    });
  });
}
