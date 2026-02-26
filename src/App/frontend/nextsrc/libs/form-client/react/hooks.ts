import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { expressionValidationPath } from 'nextsrc/libs/form-client/react/useExpressionValidation';
import { schemaValidationPath } from 'nextsrc/libs/form-client/react/useSchemaValidation';
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

export function useRemoveArrayItem(
  binding: string,
  parentBinding?: string,
  itemIndex?: number,
): (index: number) => void {
  const client = useFormClient();
  return useCallback(
    (index: number) => client.formDataStore.getState().removeArrayItem(binding, index, parentBinding, itemIndex),
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

export function useIsRequired(requiredExpr: unknown): boolean {
  const client = useFormClient();
  const formData = useStore(client.formDataStore, (state) => state.data);

  return useMemo(() => {
    const dataSources = {
      formDataGetter: (path: string) => client.formDataStore.getState().getValue(path),
      instanceDataSources: client.textResourceDataSources.instanceDataSources,
      frontendSettings: client.textResourceDataSources.applicationSettings,
    };
    return evaluateBoolean(requiredExpr, dataSources, false);
  }, [requiredExpr, client, formData]);
}

const REQUIRED_VALIDATION_KEY = '__required';

function requiredValidationPath(bindingPath: string): string {
  return `${bindingPath}:${REQUIRED_VALIDATION_KEY}`;
}

/**
 * Validates that a required field is not empty.
 * Writes/clears a validation entry in the validation store as a side-effect.
 */
export function useRequiredValidation(
  requiredExpr: unknown,
  bindingPath: string | undefined,
  value: FormDataPrimitive,
  title?: string,
): boolean {
  const client = useFormClient();
  const required = useIsRequired(requiredExpr);
  const { langAsString } = useLanguage();

  const isEmpty = value === undefined || value === null || String(value).trim() === '';
  const hasError = required && isEmpty;
  const validationPath = bindingPath ? requiredValidationPath(bindingPath) : undefined;

  useEffect(() => {
    if (!bindingPath || !validationPath) {
      return;
    }

    const store = client.validationStore.getState();
    if (hasError) {
      const fieldName = title || bindingPath;
      const message = langAsString('form_filler.error_required')?.replace('{0}', fieldName) ?? `${fieldName} is required`;
      store.setFieldValidations(validationPath, [{ severity: 'error', message }]);
    } else {
      store.clearField(validationPath);
    }

    return () => {
      client.validationStore.getState().clearField(validationPath);
    };
  }, [client, bindingPath, validationPath, hasError, title, langAsString]);

  return required;
}

const emptyValidations: FieldValidation[] = [];

export function useFieldValidations(path: string): FieldValidation[] {
  const client = useFormClient();
  const reqPath = requiredValidationPath(path);
  const exprPath = expressionValidationPath(path);
  const schemaPath = schemaValidationPath(path);
  return useStore(
    client.validationStore,
    useShallow((state) => {
      const backend = state.fieldValidations[path];
      const required = state.fieldValidations[reqPath];
      const expression = state.fieldValidations[exprPath];
      const schema = state.fieldValidations[schemaPath];
      if (!backend && !required && !expression && !schema) {
        return emptyValidations;
      }
      return [...(backend ?? []), ...(required ?? []), ...(expression ?? []), ...(schema ?? [])];
    }),
  );
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

export function useRawPageOrder(): string[] {
  const client = useFormClient();

  const subscribe = useCallback(
    (_cb: () => void) => {
      return () => {};
    },
    [client],
  );

  return useSyncExternalStore(subscribe, () => client.getPageOrder());
}

/**
 * Returns the page order filtered by hidden expressions.
 * Pages where `data.hidden` evaluates to `true` are excluded.
 * Re-evaluates when form data changes.
 */
export function usePageOrder(): string[] {
  const client = useFormClient();
  const rawOrder = useRawPageOrder();

  // Subscribe to form data so hidden expressions re-evaluate on data changes
  const formData = useStore(client.formDataStore, (state) => state.data);

  return useMemo(() => {
    const dataSources = {
      formDataGetter: (path: string) => client.formDataStore.getState().getValue(path),
      instanceDataSources: client.textResourceDataSources.instanceDataSources,
      frontendSettings: client.textResourceDataSources.applicationSettings,
    };

    return rawOrder.filter((pageId) => {
      const layout = client.getFormLayout(pageId);
      if (!layout) {
        return true;
      }
      const isHidden = evaluateBoolean(layout.data.hidden, dataSources, false);
      return !isHidden;
    });
  }, [rawOrder, formData, client]);
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
