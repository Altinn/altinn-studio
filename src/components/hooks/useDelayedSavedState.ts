import { useCallback, useEffect, useRef, useState } from 'react';

import type { IComponentProps } from 'src/layout';

export interface DelayedSavedStateRetVal {
  value: string | undefined;
  setValue: (newValue: string | undefined, saveImmediately?: boolean, skipValidation?: boolean) => void;
  saveValue: () => void;
  onPaste: () => void;
}

export function useDelayedSavedState(
  handleDataChange: IComponentProps['handleDataChange'],
  formValue?: string,
  saveAfter?: number | boolean,
): DelayedSavedStateRetVal {
  const [immediateState, _setImmediateState] = useState(formValue);
  const immediateStatePrevRef = useRef<[string | undefined, number] | undefined>(undefined);
  const immediateStateRef = useRef(formValue);
  const [saveNextChangeImmediately, setSaveNextChangeImmediately] = useState(false);
  const [skipNextValidation, setSkipNextValidation] = useState(false);
  const saveAfterMs = typeof saveAfter === 'number' ? saveAfter : 400;

  const setImmediateState = useCallback(
    (value: string | undefined) => {
      immediateStatePrevRef.current = [immediateStateRef.current, performance.now()];
      immediateStateRef.current = value;
      _setImmediateState(value);
    },
    [_setImmediateState],
  );

  const updateFormData = useCallback(
    (value: string | undefined, skipValidation = false): void => {
      if (value === formValue) {
        return;
      }

      const shouldValidate = !skipNextValidation && !skipValidation;
      handleDataChange(value, { validate: shouldValidate });
      immediateStatePrevRef.current = undefined;

      if (skipNextValidation) {
        setSkipNextValidation(false);
      }

      if (saveNextChangeImmediately) {
        setSaveNextChangeImmediately(false);
      }
    },
    [
      handleDataChange,
      formValue,
      saveNextChangeImmediately,
      setSaveNextChangeImmediately,
      setSkipNextValidation,
      skipNextValidation,
    ],
  );

  useEffect(() => {
    // When the value is controlled from the outside, by updating formData, we'll want to ignore
    // outside updates that are caused by React being slow. This code is hit by two entirely
    // different cases:
    // 1. When some outside change has been made to our value (i.e. a server calculation change, etc)
    // 2. When we called handleDataChange(), redux updated its state, the React tree re-rendered, and our
    //    component finally got their result back. In cases where the user made changes to the value before
    //    React did all its work, we'll want to ignore the change.
    if (formValue === immediateStateRef.current) {
      return;
    }
    const prev = immediateStatePrevRef.current;
    if (prev && formValue === prev[0]) {
      const change = typeof prev[1] === 'number' ? prev[1] : performance.now();
      const timeSinceChange = performance.now() - change;
      if (timeSinceChange < saveAfterMs) {
        return;
      }
    }
    setImmediateState(formValue);
  }, [formValue, setImmediateState, saveAfterMs]);

  useEffect(() => {
    if (saveAfter === false) {
      return;
    }

    const timeoutId = setTimeout(() => {
      updateFormData(immediateState);
    }, saveAfterMs);

    return () => clearTimeout(timeoutId);
  }, [immediateState, updateFormData, saveAfter, saveAfterMs]);

  return {
    value: immediateState,
    setValue: (newValue, saveImmediately = false, skipValidation = false): void => {
      setImmediateState(newValue);
      setSkipNextValidation(skipValidation && !saveImmediately && !saveNextChangeImmediately);
      if (saveImmediately || saveNextChangeImmediately) {
        updateFormData(newValue, skipValidation);
      }
    },
    saveValue: (): void => {
      updateFormData(immediateStateRef.current);
    },
    onPaste: (): void => {
      setSaveNextChangeImmediately(true);
    },
  };
}
