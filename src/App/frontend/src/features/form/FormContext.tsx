import type { StoreApi } from 'zustand';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { createZustandHooks } from 'src/core/contexts/zustandContext';
import { pageNavigationHooks } from 'src/features/form/layout/PageNavigationContext';
import { formDataHooks } from 'src/features/formData/FormDataWrite';
import { validationHooks } from 'src/features/validation/validationContext';
import { nodesHooks } from 'src/utils/layout/NodesContext';
import type { PageNavigationSliceState } from 'src/features/form/layout/PageNavigationContext';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import type { FormDataMethods, FormDataSliceState } from 'src/features/formData/FormDataWriteStateMachine';
import type { ValidationSliceState } from 'src/features/validation';
import type { ValidationInternals } from 'src/features/validation/validationContext';
import type { NodesSliceState } from 'src/utils/layout/NodesContext';

export interface FormContext {
  // Set this if this form context is provided somewhere it's not expected we should write data to the data model.
  // By setting this to true, no effects like 'preselectedOptionIndex' runs (which might try to change the data model).
  // This should always be set to true when summarizing a previous task. It's important to note that it doesn't
  // prevent any write operations from happening in case components inside try to write new form data, but it will
  // prevent automatic effects from happening.
  readOnly?: boolean;
  bootstrap: FormBootstrapContextValue;
  store: FormStoreApi;
}

const { Provider, useLaxCtx, useCtx } = createContext<FormContext>({
  name: 'Form',
  required: true,
});

export const FormProviderInternal = Provider;
export const FormProviderHooks = {
  useIsInContext() {
    return useLaxCtx() !== ContextNotProvided;
  },
  useBootstrap() {
    const ctx = useCtx();
    if (!ctx) {
      throw new Error('useBootstrap must be used within FormProvider');
    }
    return ctx.bootstrap;
  },
  useLaxBootstrap() {
    const ctx = useLaxCtx();
    if (ctx === ContextNotProvided) {
      return undefined;
    }
    return ctx.bootstrap;
  },
};

const formStoreHooks = createZustandHooks<FormStoreApi, FormStoreState>({
  useStore: () => useCtx().store,
  useLaxStore: () => {
    const ctx = useLaxCtx();
    return ctx === ContextNotProvided ? ContextNotProvided : ctx.store;
  },
});

export const FormStore = {
  raw: formStoreHooks,
  data: formDataHooks,
  validation: validationHooks,
  nodes: nodesHooks,
  pageNavigation: pageNavigationHooks,
};

export interface FormStoreState {
  data: FormDataSliceState & FormDataMethods;
  validation: ValidationSliceState & ValidationInternals;
  nodes: NodesSliceState;
  pageNavigation: PageNavigationSliceState;
}

export type FormStoreApi = StoreApi<FormStoreState>;

export type FormStoreSet = (
  partial:
    | FormStoreState
    | Partial<FormStoreState>
    | ((state: FormStoreState) => FormStoreState | Partial<FormStoreState> | void),
  replace?: boolean,
) => void;
