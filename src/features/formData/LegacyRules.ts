import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FDNewValue } from 'src/features/formData/FormDataWriteStateMachine';

/**
 * This function has been copied from checkIfRuleShouldRun() and modified to work with the new formData feature.
 * It runs the legacy rules after a field has been updated.
 */
export function runLegacyRules(ruleConnections: IRuleConnections | null, oldFormData: object, newFormData: object) {
  const changes: FDNewValue[] = [];
  if (!ruleConnections) {
    return changes;
  }

  for (const connection of Object.keys(ruleConnections)) {
    if (!connection) {
      continue;
    }

    const connectionDef = ruleConnections[connection];
    const functionToRun: string = connectionDef.selectedFunction;
    let shouldRunFunction = false;

    for (const inputPath of Object.values(connectionDef.inputParams)) {
      if (!inputPath) {
        continue;
      }
      const oldVal = dot.pick(inputPath, oldFormData);
      const newVal = dot.pick(inputPath, newFormData);
      if (!deepEqual(oldVal, newVal)) {
        shouldRunFunction = true;
      }
    }

    for (const outParam of Object.keys(connectionDef.outParams)) {
      if (!outParam) {
        shouldRunFunction = false;
      }
    }

    if (!shouldRunFunction) {
      continue;
    }

    const objectToUpdate = window.ruleHandlerHelper[functionToRun]();
    if (Object.keys(objectToUpdate).length < 1) {
      continue;
    }

    const newObj = Object.keys(objectToUpdate).reduce((acc, elem) => {
      const inputParamBinding = connectionDef.inputParams[elem];
      const value = dot.pick(inputParamBinding, newFormData);
      acc[elem] =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : undefined;
      return acc;
    }, {});

    const result = window.ruleHandlerObject[functionToRun](newObj);
    const updatedDataBinding = connectionDef.outParams.outParam0;

    if (updatedDataBinding) {
      changes.push({
        path: updatedDataBinding,
        newValue: result.toString(),
      });
    }
  }

  return changes;
}
