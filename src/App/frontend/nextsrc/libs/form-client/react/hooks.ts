import { useCallback, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

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

export function useBoundValue(
  simpleBinding: string,
  parentBinding?: string,
  itemIndex?: number,
): { value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const client = useFormClient();
  const value = useStore(
    client.formDataStore,
    useShallow((state) => state.getBoundValue(simpleBinding, parentBinding, itemIndex)),
  );
  const setValue = useCallback(
    (next: FormDataPrimitive) =>
      client.formDataStore.getState().setBoundValue(simpleBinding, next, parentBinding, itemIndex),
    [client, simpleBinding, parentBinding, itemIndex],
  );
  return { value, setValue };
}

export function useGroupArray(
  binding: string,
  parentBinding?: string,
  itemIndex?: number,
): FormDataNode[] {
  const client = useFormClient();
  return useStore(
    client.formDataStore,
    useShallow((state) => state.getArray(binding, parentBinding, itemIndex)),
  );
}

export function usePushArrayItem(
  binding: string,
  parentBinding?: string,
  itemIndex?: number,
): (item: FormDataNode) => void {
  const client = useFormClient();
  return useCallback(
    (item: FormDataNode) => client.formDataStore.getState().pushArrayItem(binding, item, parentBinding, itemIndex),
    [client, binding, parentBinding, itemIndex],
  );
}

export function useFormData(): FormDataNode {
  const client = useFormClient();
  return useStore(client.formDataStore, (state) => state.data);
}

export function useTextResource(key: string | undefined): string {
  const { langAsString } = useLanguage();
  return langAsString(key);
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

export function useLayoutNames(): string[] {
  const client = useFormClient();

  const subscribe = useCallback(
    (_cb: () => void) => {
      return () => {};
    },
    [client],
  );

  return useSyncExternalStore(subscribe, () => client.getLayoutNames());
}
