import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';

export interface FormContext {
  // Set this if this form context is provided somewhere it's not expected we should write data to the data model.
  // By setting this to true, no effects like 'preselectedOptionIndex' runs (which might try to change the data model).
  // This should always be set to true when summarizing a previous task. It's important to note that it doesn't
  // prevent any write operations from happening in case components inside try to write new form data, but it will
  // prevent automatic effects from happening.
  readOnly?: boolean;
  bootstrap: FormBootstrapContextValue;
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
