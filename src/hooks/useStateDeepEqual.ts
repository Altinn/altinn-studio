import { useMemo, useRef, useState } from 'react';
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

const customUndefined = Symbol('customUndefined');
type CustomUndefined = typeof customUndefined;

export function useMemoDeepEqual<T>(produceValue: () => T, deps: DependencyList): T {
  const lastState = useRef<T | CustomUndefined>(customUndefined);
  return useMemo(() => {
    const newState = produceValue();
    if (lastState.current === customUndefined || !deepEqual(lastState.current, newState)) {
      lastState.current = newState;
    }
    return lastState.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, produceValue]);
}
