import React, { useEffect, useState } from 'react';
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
  const expressionString = expressionToString(givenExpression);
  const isInitiallyValid = isStringValidAsExpression(expressionString);
  const [isValid, setIsValid] = useState<boolean>(isInitiallyValid);

  useEffect(() => {
    setIsValid(isInitiallyValid);
  }, [isInitiallyValid]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
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
      className={classes.manualEditor}
      error={errorMessage}
      hideLabel
      label={texts.expression}
      onChange={handleChange}
      rows={12}
      value={expressionString}
    />
  );
};
