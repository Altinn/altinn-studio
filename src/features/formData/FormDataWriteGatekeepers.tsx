import { createContext } from 'src/core/contexts/context';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';

export type FormDataWriteGatekeepers = {
  [key in keyof FormDataMethods]: (...args: Parameters<FormDataMethods[key]>) => boolean;
};

/**
 * You can provide your own gatekeeper if you want to decide which actions internal to the FormDataWriter state
 * machine should be allowed to be dispatched.
 */
const { Provider, useCtx } = createContext<FormDataWriteGatekeepers>({
  name: 'FormDataWriteGatekeeper',
  required: false,
  default: {
    debounce: () => true,
    saveFinished: () => true,
    setLeafValue: () => true,
    appendToListUnique: () => true,
    appendToList: () => true,
    removeIndexFromList: () => true,
    removeValueFromList: () => true,
    setMultiLeafValues: () => true,
    unlock: () => true,
    lock: () => true,
    requestManualSave: () => true,
  },
});

export const FormDataWriteGatekeepersProvider = Provider;
export const useFormDataWriteGatekeepers = () => useCtx();
