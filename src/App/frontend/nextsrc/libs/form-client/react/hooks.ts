import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { resolveTextResource } from 'nextsrc/libs/form-client/stores/textResourceStore';

import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedLayoutFile } from 'nextsrc/libs/form-client/moveChildren';
import type { FieldValidation } from 'nextsrc/libs/form-client/stores/validationStore';

export function useFormValue(path: string): { value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const client = useFormClient();
  const value = useStore(client.formDataStore, (state) => state.getValue(path));
  const setValue = useCallback(
    (next: FormDataPrimitive) => client.formDataStore.getState().setValue(path, next),
    [client, path],
  );
  return { value, setValue };
}

export function useFormData(): FormDataNode {
  const client = useFormClient();
  return useStore(client.formDataStore, (state) => state.data);
}

export function useTextResource(key: string | undefined): string {
  const client = useFormClient();
  const resources = useStore(client.textResourceStore, (state) => state.resources);
  const formData = useStore(client.formDataStore, (state) => state.data);

  return useMemo(() => {
    if (!key) {
      return '';
    }
    return resolveTextResource(key, resources, client.textResourceDataSources);
  }, [key, resources, formData, client]);
}

export function useFieldValidations(path: string): FieldValidation[] {
  const client = useFormClient();
  return useStore(client.validationStore, (state) => state.fieldValidations[path] ?? []);
}

export function useLayout(layoutId: string): ResolvedLayoutFile {
  const client = useFormClient();

  const subscribe = useCallback(
    (_cb: () => void) => {
      // Layouts don't change at runtime after being set, so no subscription needed
      return () => {};
    },
    [client],
  );

  return useSyncExternalStore(subscribe, () => client.getFormLayout(layoutId));
}
