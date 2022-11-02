import * as React from 'react';

import type { IComponentProps } from 'src/components';

export interface DelayedSavedStateRetVal {
  value: string | undefined;
  setValue: (newValue: string | undefined, saveImmediately?: boolean) => void;
  saveValue: () => void;
  onPaste: () => void;
}

export function useDelayedSavedState(
  handleDataChange: IComponentProps['handleDataChange'],
  formValue?: string,
  saveAfter?: number | boolean,
): DelayedSavedStateRetVal {
  const [immediateState, setImmediateState] = React.useState(formValue);
  const [saveNextChangeImmediately, setSaveNextChangeImmediately] =
    React.useState(false);

  React.useEffect(() => {
    setImmediateState(formValue);
  }, [formValue]);

  React.useEffect(() => {
    if (saveAfter === false) {
      return;
    }

    const timeout = typeof saveAfter === 'number' ? saveAfter : 400;
    const timeoutId = setTimeout(() => {
      if (immediateState !== formValue) {
        handleDataChange(immediateState);
      }
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [immediateState, handleDataChange, formValue, saveAfter]);

  return {
    value: immediateState,
    setValue: (newValue, saveImmediately) => {
      setImmediateState(newValue);
      if (newValue !== formValue) {
        if (saveImmediately) {
          handleDataChange(newValue);
        } else if (saveNextChangeImmediately) {
          // Save immediately on the next change event after a paste
          handleDataChange(newValue);
          setSaveNextChangeImmediately(false);
        }
      }
    },
    saveValue: () => {
      if (immediateState !== formValue) {
        handleDataChange(immediateState);
      }
    },
    onPaste: () => {
      setSaveNextChangeImmediately(true);
    },
  };
}
