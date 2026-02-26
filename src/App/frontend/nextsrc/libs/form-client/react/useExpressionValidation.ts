import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import { evaluateBoolean, evaluateString } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

import type { ExpressionDataSources } from 'nextsrc/libs/form-client/expressions/evaluate';
import type { FieldValidation } from 'nextsrc/libs/form-client/stores/validationStore';

const EXPRESSION_VALIDATION_KEY = '__expression';

function expressionValidationPath(fieldPath: string): string {
  return `${fieldPath}:${EXPRESSION_VALIDATION_KEY}`;
}

export { EXPRESSION_VALIDATION_KEY, expressionValidationPath };

export function useExpressionValidation(): void {
  const client = useFormClient();
  const formData = useStore(client.formDataStore, (state) => state.data);
  const { langAsString } = useLanguage();
  const previousKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const expressionValidations = client.getExpressionValidations();
    const validationStore = client.validationStore.getState();
    const currentKeys = new Set<string>();

    const dataSources: Omit<ExpressionDataSources, 'positionalArguments'> = {
      formDataGetter: (path: string) => client.formDataStore.getState().getValue(path),
      instanceDataSources: client.textResourceDataSources.instanceDataSources,
      frontendSettings: client.textResourceDataSources.applicationSettings,
      textResourceResolver: langAsString,
    };

    for (const [fieldPath, rules] of Object.entries(expressionValidations)) {
      const fieldValidations: FieldValidation[] = [];
      const fieldDataSources: ExpressionDataSources = {
        ...dataSources,
        positionalArguments: [fieldPath],
      };

      for (const rule of rules) {
        const conditionMet = evaluateBoolean(rule.condition, fieldDataSources, false);
        if (conditionMet) {
          const message = evaluateString(rule.message, fieldDataSources);
          fieldValidations.push({ severity: rule.severity, message });
        }
      }

      const key = expressionValidationPath(fieldPath);
      currentKeys.add(key);

      if (fieldValidations.length > 0) {
        validationStore.setFieldValidations(key, fieldValidations);
      } else {
        validationStore.clearField(key);
      }
    }

    // Clear keys that were active last render but no longer present
    for (const prevKey of previousKeysRef.current) {
      if (!currentKeys.has(prevKey)) {
        validationStore.clearField(prevKey);
      }
    }
    previousKeysRef.current = currentKeys;
  }, [client, formData, langAsString]);
}
