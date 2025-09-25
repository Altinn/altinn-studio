import { createContext } from 'src/core/contexts/context';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';

export type ProxyFunctionCall<M extends keyof FormDataMethods> = {
  args: Parameters<FormDataMethods[M]>;
  toCall: FormDataMethods[M];
};

export type ProxyFunction<M extends keyof FormDataMethods> = (call: ProxyFunctionCall<M>) => void;

export type Proxy<M extends keyof FormDataMethods> = (original: FormDataMethods[M]) => {
  proxy: ProxyFunction<M>;
  method: FormDataMethods[M];
};

export type FormDataWriteProxies = {
  [M in keyof FormDataMethods]: Proxy<M>;
};

const defaultProxy: Proxy<keyof FormDataMethods> = (original) => ({
  // eslint-disable-next-line prefer-spread
  proxy: ({ args, toCall }) => toCall.apply(null, args),
  method: original,
});

/**
 * You can provide your own proxies if you want to decide which actions internal to the FormDataWriter state
 * machine should be allowed to be dispatched, and/or wrap the call or change any arguments.
 */
const { Provider, useCtx } = createContext<FormDataWriteProxies>({
  name: 'FormDataWriteProxies',
  required: false,
  default: {
    debounce: defaultProxy as Proxy<'debounce'>,
    cancelSave: defaultProxy as Proxy<'cancelSave'>,
    saveFinished: defaultProxy as Proxy<'saveFinished'>,
    setLeafValue: defaultProxy as Proxy<'setLeafValue'>,
    appendToListUnique: defaultProxy as Proxy<'appendToListUnique'>,
    appendToList: defaultProxy as Proxy<'appendToList'>,
    removeIndexFromList: defaultProxy as Proxy<'removeIndexFromList'>,
    removeValueFromList: defaultProxy as Proxy<'removeValueFromList'>,
    removeFromListCallback: defaultProxy as Proxy<'removeFromListCallback'>,
    setMultiLeafValues: defaultProxy as Proxy<'setMultiLeafValues'>,
    unlock: defaultProxy as Proxy<'unlock'>,
    lock: defaultProxy as Proxy<'lock'>,
    nextLock: defaultProxy as Proxy<'nextLock'>,
    requestManualSave: defaultProxy as Proxy<'requestManualSave'>,
  },
});

export const FormDataWriteProxyProvider = Provider;
export const useFormDataWriteProxies = () => useCtx();
