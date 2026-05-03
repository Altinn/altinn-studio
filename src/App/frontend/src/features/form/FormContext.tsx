import type { StoreApi } from 'zustand';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { createZustandHooks } from 'src/core/contexts/zustandContext';
import { pageNavigationHooks } from 'src/features/form/layout/PageNavigationContext';
import { formBootstrapHooks } from 'src/features/formBootstrap/FormBootstrap';
import { formDataHooks } from 'src/features/formData/FormDataWrite';
import { validationHooks } from 'src/features/validation/validationContext';
import { nodesHooks } from 'src/utils/layout/NodesContext';
import type { PageNavigationSliceState } from 'src/features/form/layout/PageNavigationContext';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import type { FormDataMethods, FormDataSliceState } from 'src/features/formData/FormDataWriteStateMachine';
import type { ValidationSliceState } from 'src/features/validation';
import type { ValidationInternals } from 'src/features/validation/validationContext';
import type { NodesSliceState } from 'src/utils/layout/NodesContext';

const { Provider, useLaxCtx, useCtx } = createContext<FormStoreApi>({
  name: 'Form',
  required: true,
});

export const FormStoreProvider = Provider;

export const FormStore = {
  useIsInContext() {
    return useLaxCtx() !== ContextNotProvided;
  },
  useIsReadOnly() {
    return FormStore.raw.useSelector((state) => state.readOnly);
  },
  raw: createZustandHooks<FormStoreApi, FormStoreState>({
    useStore: () => useCtx(),
    useLaxStore: () => {
      const ctx = useLaxCtx();
      return ctx === ContextNotProvided ? ContextNotProvided : ctx;
    },
  }),
  data: formDataHooks,
  validation: validationHooks,
  nodes: nodesHooks,
  pageNavigation: pageNavigationHooks,
  bootstrap: formBootstrapHooks,
};

export interface FormStoreState {
  parent: FormStoreApi | undefined;

  // Set this if this form context is provided somewhere it's not expected we should write data to the data model.
  // By setting this to true, no effects like 'preselectedOptionIndex' runs (which might try to change the data model).
  // This should always be set to true when summarizing a previous task. It's important to note that it doesn't
  // prevent any write operations from happening in case components inside try to write new form data, but it will
  // prevent automatic effects from happening.
  readOnly: boolean;

  data: FormDataSliceState & FormDataMethods;
  validation: ValidationSliceState & ValidationInternals;
  nodes: NodesSliceState;
  pageNavigation: PageNavigationSliceState;
  bootstrap: FormBootstrapSliceState;
}

export type FormStoreApi = StoreApi<FormStoreState>;

export function getRootFormStore(store: FormStoreApi): FormStoreApi {
  let current = store;
  while (current.getState().parent) {
    current = current.getState().parent!;
  }
  return current;
}

export type FormStoreSet = (
  partial:
    | FormStoreState
    | Partial<FormStoreState>
    | ((state: FormStoreState) => FormStoreState | Partial<FormStoreState> | void),
  replace?: boolean,
) => void;

export interface FormBootstrapSliceState extends FormBootstrapContextValue {
  update: (bootstrap: FormBootstrapContextValue) => void;
}

export function createFormBootstrapSlice(
  bootstrap: FormBootstrapContextValue,
  set: FormStoreSet,
): FormBootstrapSliceState {
  return {
    ...bootstrap,
    update: (nextBootstrap) =>
      set((state) => {
        Object.assign(state.bootstrap, nextBootstrap);
      }),
  };
}
