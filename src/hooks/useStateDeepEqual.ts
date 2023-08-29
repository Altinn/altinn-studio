import { useState } from 'react';

import deepEqual from 'fast-deep-equal';

export function useStateDeepEqual<T>(initialValue: T) {
  const [state, setState] = useState(initialValue);
  const updateState = (newState: T) => {
    if (!deepEqual(state, newState)) {
      setState(newState);
    }
  };

  return [state, updateState] as const;
}
