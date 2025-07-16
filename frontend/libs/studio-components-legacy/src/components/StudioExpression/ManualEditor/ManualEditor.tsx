import React, { useState } from 'react';
import type { Expression } from '../types/Expression';
import { isStringValidAsExpression } from '../validators/isStringValidAsExpression';
import { stringToExpression } from '../converters/stringToExpression';
import { expressionToString } from '../converters/expressionToString';
import { StudioTextarea } from '../../StudioTextarea';
import classes from './ManualEditor.module.css';
import { useStudioExpressionContext } from '../StudioExpressionContext';

export type ManualEditorProps = {
  expression: Expression;
  onChange: (expression: Expression) => void;
  isManualExpressionValidRef: React.MutableRefObject<boolean>;
};

export const ManualEditor = ({
  expression: givenExpression,
  onChange,
  isManualExpressionValidRef,
}: ManualEditorProps) => {
  const { texts } = useStudioExpressionContext();
  const [currentInput, setCurrentInput] = useState(expressionToString(givenExpression));
  const isValid = isStringValidAsExpression(currentInput);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setCurrentInput(value);
    const isValueValid = isStringValidAsExpression(value);
    isManualExpressionValidRef.current = isValueValid;

    if (isValueValid) {
      onChange(stringToExpression(value));
    }
  };

  const errorMessage = isValid ? null : texts.cannotSaveSinceInvalid;

  return (
    <StudioTextarea
      className={classes.manualEditor}
      error={errorMessage}
      hideLabel
      label={texts.expression}
      onChange={handleChange}
      rows={12}
      value={currentInput}
    />
  );
};
