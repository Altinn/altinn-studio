import type { ChangeEvent, FocusEvent, ReactNode } from 'react';
import React, { forwardRef, useEffect, useState } from 'react';
import type { TextareaProps } from '@digdir/design-system-react';
import { Textarea } from '@digdir/design-system-react';

export type StudioTextareaProps = TextareaProps & {
  afterBlurError?: ReactNode;
};

const StudioTextarea = forwardRef<HTMLTextAreaElement, StudioTextareaProps>(
  ({ value, onChange, onBlur, error, afterBlurError, ...rest }, ref) => {
    const [valueState, setValueState] = useState(value);
    const [showError, setShowError] = useState(false);

    const disableError = () => setShowError(false);
    const enableError = () => setShowError(true);

    useEffect(() => {
      if (!value) disableError();
      setValueState(value);
    }, [value]);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      setValueState(event.target.value);
      if (!event.target.value) disableError();
      onChange?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
      if (event.target.value) enableError();
      onBlur?.(event);
    };

    const errorComponent = showError && afterBlurError ? afterBlurError : error;

    return (
      <Textarea
        error={errorComponent}
        onBlur={handleBlur}
        onChange={handleChange}
        ref={ref}
        value={valueState}
        {...rest}
      />
    );
  },
);

StudioTextarea.displayName = 'StudioTextarea';

export { StudioTextarea };
