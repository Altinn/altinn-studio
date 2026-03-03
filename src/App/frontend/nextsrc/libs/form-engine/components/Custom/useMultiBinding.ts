import { useCallback } from 'react';

import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';

import type { FormDataPrimitive } from 'nextsrc/core/api-client/data.api';

interface MultiBindingResult {
  formData: Record<string, FormDataPrimitive>;
  setValue: (field: string, value: FormDataPrimitive) => void;
}

/**
 * Hook for components with dynamic data model bindings (like Custom web components).
 * Reads all bound values from the form data store and provides a setter.
 */
export function useMultiBinding(
  bindings: Record<string, unknown> | undefined,
  parentBinding?: string,
  itemIndex?: number,
): MultiBindingResult {
  const client = useFormClient();

  const bindingKeys = bindings ? Object.keys(bindings) : [];
  const bindingPaths: Record<string, string> = {};
  for (const key of bindingKeys) {
    bindingPaths[key] = extractField(bindings![key]);
  }

  const formData = useStore(
    client.formDataStore,
    useShallow((state) => {
      const result: Record<string, FormDataPrimitive> = {};
      for (const key of bindingKeys) {
        result[key] = state.getBoundValue(bindingPaths[key], parentBinding, itemIndex);
      }
      return result;
    }),
  );

  const setValue = useCallback(
    (field: string, value: FormDataPrimitive) => {
      const path = bindingPaths[field];
      if (path) {
        client.formDataStore.getState().setBoundValue(path, value, parentBinding, itemIndex);
      }
    },
    [client, bindingPaths, parentBinding, itemIndex],
  );

  return { formData, setValue };
}
