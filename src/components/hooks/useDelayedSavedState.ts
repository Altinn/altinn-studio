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
  const immediateStateRef = useRef(formValue);
  const [saveNextChangeImmediately, setSaveNextChangeImmediately] = useState(false);
  const [skipNextValidation, setSkipNextValidation] = useState(false);

  const setImmediateState = useCallback(
    (value: string | undefined) => {
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
    setImmediateState(formValue);
  }, [formValue, setImmediateState]);

  useEffect(() => {
    if (saveAfter === false) {
      return;
    }

    const timeout = typeof saveAfter === 'number' ? saveAfter : 400;
    const timeoutId = setTimeout(() => {
      updateFormData(immediateState);
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [immediateState, updateFormData, formValue, saveAfter]);

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
