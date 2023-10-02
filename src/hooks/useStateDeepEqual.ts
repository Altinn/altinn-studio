import { useMemo, useState } from 'react';
import type { DependencyList } from 'react';

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

const undefinedValue = { __undefined__: true };
type UndefinedValue = typeof undefinedValue;
export function useMemoDeepEqual<T>(produceValue: () => T, deps: DependencyList) {
  let lastValue: T | UndefinedValue = undefinedValue;
  lastValue = useMemo(() => {
    const newValue = produceValue();
    if (lastValue !== undefinedValue && deepEqual(lastValue, newValue)) {
      return lastValue;
    }

    return newValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return lastValue;
}
