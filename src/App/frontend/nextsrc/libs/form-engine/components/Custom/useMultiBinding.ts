import { useCallback, useMemo } from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { FormDataPrimitive } from 'nextsrc/core/api-client/data.api';
import type { BindingContext } from 'nextsrc/libs/form-client/stores/formDataStore';

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
  const bindingContext: BindingContext = useMemo(() => ({ parentBinding, itemIndex }), [parentBinding, itemIndex]);

  const bindingPaths: Record<string, string> = useMemo(() => {
    if (!bindings) {
      return {};
    }
    const paths: Record<string, string> = {};
    for (const key of Object.keys(bindings)) {
      paths[key] = extractField(bindings[key]);
    }
    return paths;
  }, [bindings]);
  const bindingKeys = Object.keys(bindingPaths);

  const formData = useStore(
    client.formDataStore,
    useShallow((state) => {
      const result: Record<string, FormDataPrimitive> = {};
      for (const key of bindingKeys) {
        result[key] = state.getBoundValue(bindingPaths[key], bindingContext);
      }
      return result;
    }),
  );

  const setValue = useCallback(
    (field: string, value: FormDataPrimitive) => {
      const path = bindingPaths[field];
      if (path) {
        client.formDataStore.getState().setBoundValue(path, value, bindingContext);
      }
    },
    [client, bindingPaths, bindingContext],
  );

  return { formData, setValue };
}
