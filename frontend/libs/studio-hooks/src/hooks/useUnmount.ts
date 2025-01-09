import { useEffect, useRef } from 'react';

export function useUnmount(fun: () => void): void {
  const functionRef = useRef<() => void>(fun);

  useEffect(() => {
    functionRef.current = fun;
  }, [fun]);

  useEffect(() => () => functionRef.current(), []);
}
