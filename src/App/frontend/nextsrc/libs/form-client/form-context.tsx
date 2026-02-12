import React, { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';
import type { FormClient } from 'nextsrc/libs/form-client/form-client';

const FormClientContext = createContext<FormClient | null>(null);

export function FormClientProvider({ client, children }: { client: FormClient; children: React.ReactNode }) {
  return <FormClientContext.Provider value={client}>{children}</FormClientContext.Provider>;
}

export function useFormClient(): FormClient {
  const client = useContext(FormClientContext);
  if (!client) {
    throw new Error('Missing FormClientProvider');
  }
  return client;
}

export function useLayout(layoutId: string) {
  const client = useFormClient();

  const value = useSyncExternalStore(
    (cb) => client.subscribe(layoutId, cb),
    () => client.getFormLayout(layoutId),
  );
  return value;
}

export function useFormValue(path: string): { value: FormDataPrimitive; setValue: (v: FormDataPrimitive) => void } {
  const client = useFormClient();

  const value = useSyncExternalStore(
    (cb) => client.subscribe(path, cb),
    () => client.getValue(path),
  );

  const setValue = useCallback((next: FormDataPrimitive) => client.setValue(path, next), [client, path]);

  return { value, setValue };
}

export function useFormData(): FormDataNode {
  const client = useFormClient();

  return useSyncExternalStore(
    (cb) => client.subscribe('*', cb),
    () => client.getFormData(),
  );
}
