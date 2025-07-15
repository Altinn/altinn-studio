import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useShallowMemo } from 'src/hooks/useShallowMemo';

const Context = createContext<[boolean, { current: boolean }, (isProcessing: boolean) => void]>([
  false,
  { current: false },
  () => {
    console.error('useIsProcessing was used without a matching provider');
  },
]);

export function ProcessingProvider({ children }: PropsWithChildren) {
  const [isProcessing, _setIsProcessing] = useState<boolean>(false);
  const isProcessingRef = useRef(false);

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    isProcessingRef.current = isProcessing;
    _setIsProcessing(isProcessing);
  }, []);

  return <Context.Provider value={[isProcessing, isProcessingRef, setIsProcessing]}>{children}</Context.Provider>;
}

type ProcessFunction<T extends string> = {
  (key: T, callback: () => Promise<unknown>): Promise<void>;
  (callback: () => Promise<unknown>): Promise<void>;
};

type ProcessingResult<T extends string> = {
  performProcess: ProcessFunction<T>;
  isAnyProcessing: boolean;
  isThisProcessing: boolean;
  process: T | null;
};

/**
 * Utility to prevent the user from starting multiple long-running processes at the same time.
 * For example, when navigating, we sometimes have to wait for save or fetch new validations before
 * updating the page. This can take some time, so using this you can show a spinner and disable other
 * actions that could come into conflict with the currently running process.
 */
export function useIsProcessing<T extends string = string>(): ProcessingResult<T> {
  const [isAnyProcessing, isAnyProcessingRef, setAnyIsProcessing] = useContext(Context);
  const [process, _setProcess] = useState<T | null>(null);
  const processRef = useRef<T | null>(null);

  const setProcess = useCallback((process: T | null) => {
    processRef.current = process;
    _setProcess(process);
  }, []);

  useEffect(
    () => () => {
      if (processRef.current) {
        setAnyIsProcessing(false);
      }
    },
    // If this is processing when the component unmounts, clean up the state since we don't know if the calback will finish now,
    // if e.g. it depends on a useWaitForState it will unsubscribe from changes at this point and never resolve.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const performProcess = useCallback(
    async (keyOrCallback: T | (() => Promise<unknown>), _callback?: () => Promise<unknown>) => {
      if (isAnyProcessingRef.current) {
        return;
      }
      const callback = typeof keyOrCallback === 'function' ? keyOrCallback : _callback!;
      const key = typeof keyOrCallback === 'string' ? keyOrCallback : ('__process__' as T);
      try {
        setAnyIsProcessing(true);
        setProcess(key);
        await callback();
      } finally {
        setProcess(null);
        setAnyIsProcessing(false);
      }
    },
    [isAnyProcessingRef, setAnyIsProcessing, setProcess],
  );

  return useShallowMemo({
    performProcess,
    isAnyProcessing,
    isThisProcessing: !!process,
    process,
  });
}
