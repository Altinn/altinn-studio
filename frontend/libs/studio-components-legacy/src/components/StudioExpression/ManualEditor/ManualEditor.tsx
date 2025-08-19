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
}: ManualEditorProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const expressionString = expressionToString(givenExpression);
  const [isValid, setIsValid] = useState<boolean>(isStringValidAsExpression(expressionString));

  // Sync local validity when the expression is cleared by external deletion
  useEffect(() => {
    const isValidAfterExternalChange = isStringValidAsExpression(expressionString);
    setIsValid(isValidAfterExternalChange);
    isManualExpressionValidRef.current = isValidAfterExternalChange;
  }, [expressionString, isManualExpressionValidRef]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const { value } = event.target;
    const isValueValid = isStringValidAsExpression(value);
    isManualExpressionValidRef.current = isValueValid;
    setIsValid(isValueValid);

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
      value={expressionString}
    />
  );
};
