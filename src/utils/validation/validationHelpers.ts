import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { Triggers } from 'src/layout/common.generated';
import type { IRuntimeState, TriggersPageValidation } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  IComponentValidationResult,
  IComponentValidations,
  ILayoutValidationResult,
  ILayoutValidations,
  IValidationContext,
  IValidationMessage,
  IValidationObject,
  IValidationResult,
  IValidations,
  ValidationSeverity,
} from 'src/utils/validation/types';

export function validationContextFromState(state: IRuntimeState, node: LayoutNode | undefined): IValidationContext {
  return {
    formData: state.formData.formData,
    langTools: staticUseLanguageFromState(state, node),
    attachments: state.attachments.attachments,
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
    schemas: state.formDataModel.schemas,
    customValidation: state.customValidation.customValidation,
  };
}

export function buildValidationObject(
  node: LayoutNode,
  severity: ValidationSeverity,
  message: string,
  bindingKey = 'simpleBinding',
  invalidDataTypes = false,
): IValidationObject {
  return {
    empty: false,
    componentId: node.item.id,
    pageKey: node.pageKey(),
    bindingKey,
    severity,
    message,
    invalidDataTypes,
    rowIndices: node.getRowIndices(),
  };
}

export function emptyValidation(node: LayoutNode): IValidationObject {
  return {
    empty: true,
    componentId: node.item.id,
    pageKey: node.pageKey(),
    rowIndices: node.getRowIndices(),
  };
}

export function unmappedError(severity: ValidationSeverity, message: string): IValidationObject {
  return {
    empty: false,
    componentId: 'unmapped',
    pageKey: 'unmapped',
    bindingKey: 'unmapped',
    severity,
    message,
    invalidDataTypes: false,
    rowIndices: [],
  };
}

/**
 * Takes an array of validation objects and removes all fixed validations from the same array.
 */
export function removeFixedValidations(validationObjects: IValidationObject[]): IValidationObject[] {
  const fixedValidations = validationObjects.filter(
    (f) => !f.empty && f.severity === 'fixed',
  ) as IValidationMessage<'fixed'>[];

  if (fixedValidations.length === 0) {
    return validationObjects;
  }

  return validationObjects.filter(
    (v) =>
      v.empty ||
      v.severity === 'fixed' ||
      !fixedValidations.find(
        (f) =>
          v.pageKey === f.pageKey &&
          v.componentId === f.componentId &&
          v.bindingKey === f.bindingKey &&
          v.message === f.message,
      ),
  );
}

/**
 * Checks whether an array of validation objects contains any errors.
 * Used for checking if the user can proceed to the next page.
 * @see canFormBeSaved
 */
export function containsErrors(validationObjects: IValidationObject[]): boolean {
  return removeFixedValidations(validationObjects).some(
    (o) => !o.empty && (o.severity === 'errors' || o.invalidDataTypes),
  );
}

/**
 * Checks whether an array of validation objects contains invalid data types.
 * Is invalidDataTypes useful?
 */
export function hasInvalidDataTypes(validationObjects: IValidationObject[]): boolean {
  return removeFixedValidations(validationObjects).some((o) => !o.empty && o.invalidDataTypes);
}

// Preserves fixed validations, as these can fix validations on other components.
export function filterValidationObjectsByPage(
  validations: IValidationObject[],
  trigger: TriggersPageValidation,
  currentView: string,
  pageOrder: string[],
): IValidationObject[] {
  if (trigger === Triggers.ValidateAllPages) {
    return validations;
  }

  if (trigger === Triggers.ValidateCurrentAndPreviousPages) {
    const index = pageOrder.indexOf(currentView);
    const previousPages = pageOrder.slice(0, index + 1);
    return validations.filter((v) => previousPages.includes(v.pageKey) || (!v.empty && v.severity === 'fixed'));
  }

  if (trigger === Triggers.ValidatePage) {
    return validations.filter((v) => v.pageKey === currentView || (!v.empty && v.severity === 'fixed'));
  }

  return [];
}

// Preserves fixed validations, as these can fix validations on other components.
export function filterValidationObjectsByRowIndex(
  rowIndex: number,
  baseRowIndices: number[],
  validationObjects: IValidationObject[],
): IValidationObject[] {
  const filteredValidationObjects: IValidationObject[] = [];
  const rowIndicesToCompare = [...baseRowIndices, rowIndex];
  for (const o of validationObjects) {
    if (!o.empty && o.severity === 'fixed') {
      filteredValidationObjects.push(o);
      continue;
    }

    if (o.rowIndices.length < rowIndicesToCompare.length) {
      continue;
    }
    if (rowIndicesToCompare.every((index, i) => o.rowIndices[i] === index)) {
      filteredValidationObjects.push(o);
    }
  }
  return filteredValidationObjects;
}

/**
 * This function assumes that all validation outputs are for the same component. (except for fixed messages)
 */
export function createComponentValidations(
  validationOutputs: IValidationObject[],
): [IComponentValidations, IValidationMessage<'fixed'>[]] {
  if (validationOutputs.length === 0) {
    return [{}, []];
  }
  const componentValidations = {};
  const fixedValidations: IValidationMessage<'fixed'>[] = [];

  for (const output of validationOutputs) {
    if (output.empty) {
      continue;
    }

    if (output.severity === 'fixed') {
      fixedValidations.push(output);
      continue;
    }

    const { bindingKey, severity, message } = output;

    if (componentValidations[bindingKey]?.[severity] && !componentValidations[bindingKey][severity].includes(message)) {
      componentValidations[bindingKey][severity].push(message);
      continue;
    }
    if (componentValidations[bindingKey]) {
      componentValidations[bindingKey][severity] = [message];
      continue;
    }
    componentValidations[bindingKey] = { [severity]: [message] };
  }

  return [componentValidations, fixedValidations];
}

/**
 * This function assumes that all validation outputs are for the same layout. (except for fixed messages)
 */
export function createLayoutValidations(
  validationOutputs: IValidationObject[],
): [ILayoutValidations, IValidationMessage<'fixed'>[]] {
  if (validationOutputs.length === 0) {
    return [{}, []];
  }

  const layoutValidations = {};
  const fixedValidations: IValidationMessage<'fixed'>[] = [];

  for (const output of validationOutputs) {
    if (output.empty) {
      if (!layoutValidations[output.componentId]) {
        layoutValidations[output.componentId] = {};
      }
      continue;
    }

    if (output.severity === 'fixed') {
      fixedValidations.push(output);
      continue;
    }

    const { componentId, bindingKey, severity, message } = output;

    if (
      layoutValidations[componentId]?.[bindingKey]?.[severity] &&
      !layoutValidations[componentId][bindingKey][severity].includes(message)
    ) {
      layoutValidations[componentId][bindingKey][severity].push(message);
      continue;
    }
    if (layoutValidations[componentId]?.[bindingKey]) {
      layoutValidations[componentId][bindingKey][severity] = [message];
      continue;
    }
    if (layoutValidations[componentId]) {
      layoutValidations[componentId][bindingKey] = { [severity]: [message] };
      continue;
    }
    layoutValidations[componentId] = { [bindingKey]: { [severity]: [message] } };
  }
  return [layoutValidations, fixedValidations];
}

export function createValidations(
  validationOutputs: IValidationObject[],
): [IValidations, IValidationMessage<'fixed'>[]] {
  if (validationOutputs.length === 0) {
    return [{}, []];
  }

  const validations = {};
  const fixedValidations: IValidationMessage<'fixed'>[] = [];

  for (const output of validationOutputs) {
    if (output.empty) {
      if (!validations[output.pageKey]) {
        validations[output.pageKey] = { [output.componentId]: {} };
        continue;
      }
      if (!validations[output.pageKey][output.componentId]) {
        validations[output.pageKey][output.componentId] = {};
      }
      continue;
    }

    if (output.severity === 'fixed') {
      fixedValidations.push(output);
      continue;
    }

    const { pageKey, componentId, bindingKey, severity, message } = output;

    if (
      validations[pageKey]?.[componentId]?.[bindingKey]?.[severity] &&
      !validations[pageKey][componentId][bindingKey][severity].includes(message)
    ) {
      validations[pageKey][componentId][bindingKey][severity].push(message);
      continue;
    }
    if (validations[pageKey]?.[componentId]?.[bindingKey]) {
      validations[pageKey][componentId][bindingKey][severity] = [message];
      continue;
    }
    if (validations[pageKey]?.[componentId]) {
      validations[pageKey][componentId][bindingKey] = { [severity]: [message] };
      continue;
    }
    if (validations[pageKey]) {
      validations[pageKey][componentId] = { [bindingKey]: { [severity]: [message] } };
      continue;
    }
    validations[pageKey] = { [componentId]: { [bindingKey]: { [severity]: [message] } } };
  }
  return [validations, fixedValidations];
}

/**
 * Takes a list of validation objects and converts into the format used for the redux reducer 'updateComponentValidations'.
 */
export function createComponentValidationResult(validationOutputs: IValidationObject[]): IComponentValidationResult {
  const [validations, fixedValidations] = createComponentValidations(validationOutputs);
  const invalidDataTypes = hasInvalidDataTypes(validationOutputs);

  const result: IComponentValidationResult = {
    validations,
    invalidDataTypes,
    fixedValidations,
  };
  return result;
}

/**
 * Takes a list of validation objects and converts into the format used for the redux reducer 'updateLayoutValidations'.
 */
export function createLayoutValidationResult(validationOutputs: IValidationObject[]): ILayoutValidationResult {
  const [validations, fixedValidations] = createLayoutValidations(validationOutputs);
  const invalidDataTypes = hasInvalidDataTypes(validationOutputs);

  const result: ILayoutValidationResult = {
    validations,
    invalidDataTypes,
    fixedValidations,
  };
  return result;
}

/**
 * Takes a list of validation objects and converts into the format used for the redux reducer 'updateValidations'.
 */
export function createValidationResult(validationOutputs: IValidationObject[]): IValidationResult {
  const [validations, fixedValidations] = createValidations(validationOutputs);
  const invalidDataTypes = hasInvalidDataTypes(validationOutputs);

  const result: IValidationResult = {
    validations,
    invalidDataTypes,
    fixedValidations,
  };
  return result;
}
