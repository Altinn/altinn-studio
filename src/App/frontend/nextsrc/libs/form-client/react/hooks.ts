import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { expressionValidationPath } from 'nextsrc/libs/form-client/react/useExpressionValidation';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { schemaValidationPath } from 'nextsrc/libs/form-client/react/useSchemaValidation';
import { extractBinding } from 'nextsrc/libs/form-client/resolveBindings';
import { selectCurrentData } from 'nextsrc/libs/form-client/stores/formDataStore';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/api-client/data.api';
import type { ResolvedLayoutFile } from 'nextsrc/libs/form-client/moveChildren';
import type { DataModelBinding } from 'nextsrc/libs/form-client/resolveBindings';
import type { BindingContext } from 'nextsrc/libs/form-client/stores/formDataStore';
import type { FieldValidation } from 'nextsrc/libs/form-client/stores/validationStore';

export function useFormValue(
  path: string,
  dataType?: string,
): { value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const client = useFormClient();
  const dt = dataType ?? client.defaultDataType;
  const value = useStore(client.formDataStore, (state) => state.getValue(path, dt));
  const setValue = useCallback(
    (next: FormDataPrimitive) => client.formDataStore.getState().setValue(path, next, dt),
    [client, path, dt],
  );
  return { value, setValue };
}

function useResolvedBinding(binding: string | DataModelBinding, parentBinding?: string, itemIndex?: number) {
  const client = useFormClient();
  const { dataType, field } = extractBinding(binding, client.defaultDataType);
  const bindingContext: BindingContext = useMemo(
    () => ({ parentBinding, itemIndex, dataType }),
    [parentBinding, itemIndex, dataType],
  );
  return { client, field, bindingContext };
}

export function useBoundValue(
  binding: string | DataModelBinding,
  parentBinding?: string,
  itemIndex?: number,
): { value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const { client, field, bindingContext } = useResolvedBinding(binding, parentBinding, itemIndex);
  const value = useStore(
    client.formDataStore,
    useShallow((state) => state.getBoundValue(field, bindingContext)),
  );
  const setValue = useCallback(
    (next: FormDataPrimitive) => client.formDataStore.getState().setBoundValue(field, next, bindingContext),
    [client, field, bindingContext],
  );
  return { value, setValue };
}

/**
 * Resolves a raw component binding (string, object, or undefined) into
 * a bound value, setter, and the extracted field path string.
 *
 * This ensures the full binding (including dataType) is passed to the
 * store, while the extracted field string is used for validation paths.
 */
export function useComponentBinding(
  rawBinding: unknown,
  parentBinding?: string,
  itemIndex?: number,
): { field: string; value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const binding = (rawBinding ?? '') as string | DataModelBinding;
  const { value, setValue } = useBoundValue(binding, parentBinding, itemIndex);
  const client = useFormClient();
  const { field } = extractBinding(binding, client.defaultDataType);
  return { field, value, setValue };
}

export function useGroupArray(
  binding: string | DataModelBinding,
  parentBinding?: string,
  itemIndex?: number,
): FormDataNode[] {
  const { client, field, bindingContext } = useResolvedBinding(binding, parentBinding, itemIndex);
  return useStore(
    client.formDataStore,
    useShallow((state) => state.getArray(field, bindingContext)),
  );
}

export function usePushArrayItem(
  binding: string | DataModelBinding,
  parentBinding?: string,
  itemIndex?: number,
): (item: FormDataNode) => void {
  const { client, field, bindingContext } = useResolvedBinding(binding, parentBinding, itemIndex);
  return useCallback(
    (item: FormDataNode) => client.formDataStore.getState().pushArrayItem(field, item, bindingContext),
    [client, field, bindingContext],
  );
}

export function useRemoveArrayItem(
  binding: string | DataModelBinding,
  parentBinding?: string,
  itemIndex?: number,
): (index: number) => void {
  const { client, field, bindingContext } = useResolvedBinding(binding, parentBinding, itemIndex);
  return useCallback(
    (index: number) => client.formDataStore.getState().removeArrayItem(field, index, bindingContext),
    [client, field, bindingContext],
  );
}

export function useFormData(): FormDataNode {
  const client = useFormClient();
  return useStore(client.formDataStore, selectCurrentData);
}

export function useTextResource(key: string | undefined): string {
  const { langAsString } = useLanguage();
  return langAsString(key);
}

export function useIsRequired(requiredExpr: unknown): boolean {
  const client = useFormClient();

  // Evaluate required expression inside a Zustand selector so the component
  // only re-renders when the boolean result actually changes, not on every
  // form data update.
  return useStore(client.formDataStore, () => {
    const dataSources = {
      formDataGetter: (path: string) => client.formDataStore.getState().getValue(path, client.defaultDataType),
      instanceDataSources: client.textResourceDataSources.instanceDataSources,
      frontendSettings: client.textResourceDataSources.applicationSettings,
    };
    return evaluateBoolean(requiredExpr, dataSources, false);
  });
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
      const message =
        langAsString('form_filler.error_required')?.replace('{0}', fieldName) ?? `${fieldName} is required`;
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
    (_cb: () => void) =>
      // Layouts don't change at runtime after being set, so no subscription needed
      () => {},
    [],
  );

  return useSyncExternalStore(subscribe, () => client.getFormLayout(layoutId));
}

export function useRawPageOrder(): string[] {
  const client = useFormClient();

  const subscribe = useCallback((_cb: () => void) => () => {}, []);

  return useSyncExternalStore(subscribe, () => client.getPageOrder());
}

/**
 * Returns the page order filtered by hidden expressions.
 * Pages where `data.hidden` evaluates to `true` are excluded.
 * Re-evaluates when form data changes, but only triggers a re-render
 * when the resulting page list actually changes.
 */
export function usePageOrder(): string[] {
  const client = useFormClient();
  const rawOrder = useRawPageOrder();

  return useStore(
    client.formDataStore,
    useShallow(() => {
      const dataSources = {
        formDataGetter: (path: string) => client.formDataStore.getState().getValue(path, client.defaultDataType),
        instanceDataSources: client.textResourceDataSources.instanceDataSources,
        frontendSettings: client.textResourceDataSources.applicationSettings,
      };

      return rawOrder.filter((pageId) => {
        const layout = client.getFormLayout(pageId);
        if (!layout) {
          return true;
        }
        return !evaluateBoolean(layout.data.hidden, dataSources, false);
      });
    }),
  );
}

export function useLayoutNames(): string[] {
  const client = useFormClient();

  const subscribe = useCallback((_cb: () => void) => () => {}, []);

  return useSyncExternalStore(subscribe, () => client.getLayoutNames());
}
