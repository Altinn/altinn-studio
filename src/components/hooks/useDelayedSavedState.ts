import * as React from 'react';

import type { IComponentProps } from 'src/components';

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
  const [immediateState, _setImmediateState] = React.useState(formValue);
  const immediateStateRef = React.useRef(formValue);
  const [saveNextChangeImmediately, setSaveNextChangeImmediately] = React.useState(false);
  const [skipNextValidation, setSkipNextValidation] = React.useState(false);

  const setImmediateState = React.useCallback(
    (value: string | undefined) => {
      immediateStateRef.current = value;
      _setImmediateState(value);
    },
    [_setImmediateState],
  );

  const updateFormData = React.useCallback(
    (value: string | undefined, skipValidation = false) => {
      const validate = !skipNextValidation && !skipValidation;
      if (value !== formValue) {
        validate && handleDataChange(value);
        !validate && handleDataChange(value, { validate: false });
        if (skipNextValidation) {
          setSkipNextValidation(false);
        }
        if (saveNextChangeImmediately) {
          setSaveNextChangeImmediately(false);
        }
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

  React.useEffect(() => {
    setImmediateState(formValue);
  }, [formValue, setImmediateState]);

  React.useEffect(() => {
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
    setValue: (newValue, saveImmediately = false, skipValidation = false) => {
      setImmediateState(newValue);
      setSkipNextValidation(skipValidation && !saveImmediately && !saveNextChangeImmediately);
      if (saveImmediately || saveNextChangeImmediately) {
        updateFormData(newValue, skipValidation);
      }
    },
    saveValue: () => {
      updateFormData(immediateStateRef.current);
    },
    onPaste: () => {
      setSaveNextChangeImmediately(true);
    },
  };
}
