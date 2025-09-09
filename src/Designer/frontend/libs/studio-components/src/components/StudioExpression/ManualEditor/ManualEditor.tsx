import React, { useState } from 'react';
import type { Expression } from '../types/Expression';
import { isStringValidAsExpression } from '../validators/isStringValidAsExpression';
import { stringToExpression } from '../converters/stringToExpression';
import { expressionToString } from '../converters/expressionToString';
import { StudioTextarea } from '../../StudioTextarea';
import classes from './ManualEditor.module.css';
import { useStudioExpressionContext } from '../StudioExpressionContext';
import { usePropState } from '@studio/hooks';

export type ManualEditorProps = {
  expression: Expression;
  onChange: (expression: Expression) => void;
  isManualExpressionValidRef: React.MutableRefObject<boolean>;
};

export const ManualEditor = ({
  expression: givenExpression,
  onChange,
  isManualExpressionValidRef,
}: ManualEditorProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const initialExpressionString = expressionToString(givenExpression);
  const isInitiallyValid = isStringValidAsExpression(initialExpressionString);
  const [expressionString, setExpressionString] = usePropState<string>(initialExpressionString);
  const [isValid, setIsValid] = useState<boolean>(isInitiallyValid);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    const { value } = event.target;
    setExpressionString(value);
    if (isStringValidAsExpression(value)) {
      const expression = stringToExpression(value);
      onChange(expression);
      setIsValid(true);
      isManualExpressionValidRef.current = true;
    } else {
      setIsValid(false);
      isManualExpressionValidRef.current = false;
    }
  };

  const errorMessage = isValid ? null : texts.cannotSaveSinceInvalid;

  return (
    <StudioTextarea
      aria-label={texts.expression}
      className={classes.manualEditor}
      error={errorMessage}
      onChange={handleChange}
      rows={12}
      value={expressionString}
    />
  );
};
