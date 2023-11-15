import { useCallback, useEffect, useRef, useState } from 'react';

import type { IComponentProps } from 'src/layout';

export interface DelayedSavedStateRetVal {
  value: string | undefined;
  setValue: (newValue: string | undefined, saveImmediately?: boolean, skipValidation?: boolean) => void;
  saveValue: () => void;
  onPaste: () => void;
}

interface PathMap {
  [path: string]: boolean;
}

export const pathsChangedFromServer: { current: PathMap } = { current: {} };

export function useDelayedSavedState(
  handleDataChange: IComponentProps<any>['handleDataChange'],
  dataModelBinding: string | undefined,
  formValue?: string,
  saveAfter?: number | boolean,
): DelayedSavedStateRetVal {
  const [immediateState, _setImmediateState] = useState(formValue);
  const immediateStateRef = useRef(formValue);
  const immediateStateChangedRef = useRef(false);
  const [saveNextChangeImmediately, setSaveNextChangeImmediately] = useState(false);
  const [skipNextValidation, setSkipNextValidation] = useState(false);

  const overridden = global && (global as any).delayedSaveState && (global as any).delayedSaveState;
  const saveAfterMs = typeof overridden === 'number' ? overridden : typeof saveAfter === 'number' ? saveAfter : 400;

  const setImmediateState = useCallback(
    (value: string | undefined, changeFromFormValue: boolean) => {
      if (immediateStateRef.current === value) {
        return;
      }
      immediateStateRef.current = value;
      immediateStateChangedRef.current = changeFromFormValue;
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
    // When the value is controlled from the outside, by updating formData, we'll want to ignore
    // outside updates that are caused by React being slow. This code is hit by two entirely
    // different cases:
    // 1. When some outside change has been made to our value (i.e. a server calculation change, etc)
    // 2. When we called handleDataChange(), redux updated its state, the React tree re-rendered, and our
    //    component finally got their result back. In cases where the user made changes to the value before
    //    React did all its work, we'll want to ignore the change.
    const now = immediateStateRef.current;
    if (formValue === now) {
      return;
    }
    if (dataModelBinding !== undefined && pathsChangedFromServer.current[dataModelBinding]) {
      // We know the change came from the server, so we'll want to override it and ignore any changes here
      setImmediateState(formValue, false);
    } else if (!immediateStateChangedRef.current) {
      // No local changes, accept change from server/calculation
      setImmediateState(formValue, false);
    } else {
      // Local changes, ignore change from server/calculation and keep the value the user entered
    }
  }, [formValue, setImmediateState, saveAfterMs, dataModelBinding]);

  useEffect(() => {
    if (saveAfter === false || !immediateStateChangedRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      immediateStateChangedRef.current = false;
      updateFormData(immediateState);
    }, saveAfterMs);

    return () => clearTimeout(timeoutId);
  }, [immediateState, updateFormData, saveAfter, saveAfterMs]);

  return {
    value: immediateState,
    setValue: (newValue, saveImmediately = false, skipValidation = false): void => {
      setImmediateState(newValue, true);
      setSkipNextValidation(skipValidation && !saveImmediately && !saveNextChangeImmediately);
      if (saveImmediately || saveNextChangeImmediately) {
        updateFormData(newValue, skipValidation);
        immediateStateChangedRef.current = false;
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
