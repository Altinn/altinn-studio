import React, { createContext, useContext } from 'react';

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
