import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { getErrorParams, getErrorTextKey } from 'nextsrc/libs/form-client/schemaValidation';

import type { FieldValidation } from 'nextsrc/libs/form-client/stores/validationStore';

const SCHEMA_VALIDATION_KEY = '__schema';

function schemaValidationPath(fieldPath: string): string {
  return `${fieldPath}:${SCHEMA_VALIDATION_KEY}`;
}

export { SCHEMA_VALIDATION_KEY, schemaValidationPath };

/**
 * Converts a JSON pointer (e.g. "/person/0/name") to dot notation (e.g. "person[0].name").
 */
function pointerToDotNotation(path: string): string {
  const parts: string[] = [];

  for (const part of path.split('/')) {
    if (part === '') {
      continue;
    }

    if (part.match(/^\d+$/) && parts.length > 0) {
      parts[parts.length - 1] = `${parts[parts.length - 1]}[${part}]`;
    } else {
      parts.push(part);
    }
  }

  return parts.join('.');
}

export function useSchemaValidation(): void {
  const client = useFormClient();
  const formData = useStore(client.formDataStore, (state) => state.data);
  const { langAsString } = useLanguage();
  const previousKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const validator = client.getSchemaValidator();
    if (!validator) {
      return;
    }

    const validationStore = client.validationStore.getState();
    const currentKeys = new Set<string>();
    const fieldErrors = new Map<string, FieldValidation[]>();

    // structuredClone because AJV with coerceTypes mutates the input
    const valid = validator.validate('schema', structuredClone(formData));

    if (!valid) {
      const errors = validator.errors ?? [];

      for (const error of errors) {
        // Skip empty data, required keyword, oneOf, and null type errors
        if (
          error.data == null ||
          error.data === '' ||
          error.keyword === 'required' ||
          error.keyword === 'oneOf' ||
          error.params?.type === 'null'
        ) {
          continue;
        }

        // Skip formatMinimum/formatMaximum if the value also violates the format itself
        if (
          (error.keyword === 'formatMinimum' ||
            error.keyword === 'formatMaximum' ||
            error.keyword === 'formatExclusiveMinimum' ||
            error.keyword === 'formatExclusiveMaximum') &&
          errors.some((e) => e.keyword === 'format' && e.instancePath === error.instancePath)
        ) {
          continue;
        }

        const field = pointerToDotNotation(error.instancePath);
        const key = schemaValidationPath(field);
        currentKeys.add(key);

        const textKey = getErrorTextKey(error);
        const errorParams = getErrorParams(error);
        const message = errorParams !== null ? langAsString(textKey, [errorParams]) : langAsString(textKey);

        if (!fieldErrors.has(key)) {
          fieldErrors.set(key, []);
        }
        fieldErrors.get(key)!.push({ severity: 'error', message });
      }
    }

    // Write collected validations to the store
    for (const [key, validations] of fieldErrors) {
      validationStore.setFieldValidations(key, validations);
    }

    // Clear keys that were active last render but are no longer present
    for (const prevKey of previousKeysRef.current) {
      if (!currentKeys.has(prevKey)) {
        validationStore.clearField(prevKey);
      }
    }
    previousKeysRef.current = currentKeys;
  }, [client, formData, langAsString]);
}
