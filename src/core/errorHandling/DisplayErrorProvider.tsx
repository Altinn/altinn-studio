import React, { createContext, useContext, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { DisplayError } from 'src/core/errorHandling/DisplayError';

const Context = createContext<(error: Error) => void>(() => {});
Context.displayName = 'DisplayErrorContext';

export function DisplayErrorProvider({ children }: PropsWithChildren) {
  const [error, setError] = useState<Error | null>(null);

  if (error != null) {
    return <DisplayError error={error} />;
  }

  return <Context.Provider value={setError}>{children}</Context.Provider>;
}

export const useDisplayError = () => useContext(Context);
