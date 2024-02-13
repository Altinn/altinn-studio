import type { ChangeEvent, FocusEvent, ReactNode } from 'react';
import React, { forwardRef, useEffect, useState } from 'react';
import type { TextareaProps } from '@digdir/design-system-react';
import { Textarea } from '@digdir/design-system-react';

export type StudioTextareaProps = TextareaProps & {
  afterBlurError?: ReactNode;
};

const StudioTextarea = forwardRef<HTMLTextAreaElement, StudioTextareaProps>(
  ({ value: givenValue, onChange, onBlur, error, afterBlurError, ...rest }, ref) => {
    const [content, setContent] = useState(givenValue);
    const [showError, setShowError] = useState(false);

    const disableError = () => setShowError(false);
    const enableError = () => setShowError(true);

    useEffect(() => {
      if (!givenValue) disableError();
      setContent(givenValue);
    }, [givenValue]);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = event.target;
      setContent(value);
      if (!value) disableError();
      onChange?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
      if (event.target.value) enableError();
      onBlur?.(event);
    };

    const errorComponent = showError && afterBlurError ? afterBlurError : error;

    return (
      <Textarea
        ref={ref}
        {...rest}
        error={errorComponent}
        onBlur={handleBlur}
        onChange={handleChange}
        value={content}
      />
    );
  },
);

StudioTextarea.displayName = 'StudioTextarea';

export { StudioTextarea };
