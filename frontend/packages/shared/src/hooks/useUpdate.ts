import { useEffect, useRef } from 'react';

/**
 * This hook corresponds to the componentDidUpdate function in class components.
 * It is similar to useEffect, but does not run on the first render.
 * @param effect The function to run when one of the dependencies change. It may return a cleanup function, exactly like in useEffect.
 * @param deps The dependencies to watch for changes.
 */
export const useUpdate: typeof useEffect = (effect, deps) => {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
    } else {
      return effect();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
};
