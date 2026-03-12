import { useCallback, useMemo } from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { extractBinding } from 'nextsrc/libs/form-client/resolveBindings';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { FormDataPrimitive } from 'nextsrc/core/api-client/data.api';
import type { DataModelBinding } from 'nextsrc/libs/form-client/resolveBindings';
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
  const resolvedBindings: Record<string, DataModelBinding> = useMemo(() => {
    if (!bindings) {
      return {};
    }
    const resolved: Record<string, DataModelBinding> = {};
    for (const key of Object.keys(bindings)) {
      resolved[key] = extractBinding(bindings[key], client.defaultDataType);
    }
    return resolved;
  }, [bindings, client.defaultDataType]);
  const bindingKeys = Object.keys(resolvedBindings);

  const formData = useStore(
    client.formDataStore,
    useShallow((state) => {
      const result: Record<string, FormDataPrimitive> = {};
      for (const key of bindingKeys) {
        const { field, dataType } = resolvedBindings[key];
        const ctx: BindingContext = { parentBinding, itemIndex, dataType };
        result[key] = state.getBoundValue(field, ctx);
      }
      return result;
    }),
  );

  const setValue = useCallback(
    (bindingKey: string, value: FormDataPrimitive) => {
      const binding = resolvedBindings[bindingKey];
      if (binding) {
        const ctx: BindingContext = { parentBinding, itemIndex, dataType: binding.dataType };
        client.formDataStore.getState().setBoundValue(binding.field, value, ctx);
      }
    },
    [client, resolvedBindings, parentBinding, itemIndex],
  );

  return { formData, setValue };
}
