import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FDNewValue } from 'src/features/formData/FormDataWriteStateMachine';

/**
 * This function has been copied from checkIfRuleShouldRun() and modified to work with the new formData feature.
 * It runs the legacy rules after a field has been updated.
 */
export function runLegacyRules(
  ruleConnections: IRuleConnections | null,
  oldFormData: object,
  newFormData: object,
  dataType: string,
) {
  const changes: FDNewValue[] = [];
  if (!ruleConnections) {
    return changes;
  }

  for (const ruleKey of Object.keys(ruleConnections)) {
    const rule = ruleConnections[ruleKey];
    if (!ruleKey || !rule) {
      continue;
    }

    const functionToRun = rule.selectedFunction;
    let shouldRunFunction = false;
    const inputKeys: string[] = [];

    for (const inputKey of Object.keys(rule.inputParams)) {
      const inputPath = rule.inputParams[inputKey];
      if (!inputPath) {
        continue;
      }
      inputKeys.push(inputKey);
      const oldVal = dot.pick(inputPath, oldFormData);
      const newVal = dot.pick(inputPath, newFormData);
      if (!deepEqual(oldVal, newVal)) {
        shouldRunFunction = true;
      }
    }

    for (const outParam of Object.keys(rule.outParams)) {
      if (!outParam) {
        shouldRunFunction = false;
      }
    }

    if (!shouldRunFunction) {
      continue;
    }

    if (inputKeys.length <= 0) {
      continue;
    }

    const newObj = {} as Record<string, string | number | boolean | null>;
    for (const key of inputKeys) {
      const inputParamBinding = rule.inputParams[key];
      const value = dot.pick(inputParamBinding, newFormData);
      newObj[key] = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
    }

    const func = window.ruleHandlerObject[functionToRun];
    if (!func || typeof func !== 'function') {
      window.logErrorOnce(`Rule function '${functionToRun}' not found, rules referencing this function will not run.`);
      continue;
    }

    const result = func(newObj);
    const updatedDataBinding = rule.outParams.outParam0;

    if (updatedDataBinding) {
      changes.push({
        reference: { field: updatedDataBinding, dataType },
        newValue: result,
      });
    }
  }

  return changes;
}
