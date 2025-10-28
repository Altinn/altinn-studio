import React, { useState } from 'react';
import type { Expression } from '../StudioExpression/types/Expression';
import { isStringValidAsExpression } from '../StudioExpression/validators/isStringValidAsExpression';
import { stringToExpression, expressionToString } from './StudioManualExpressionUtils';
import { StudioTextarea } from '../StudioTextarea';
import classes from './StudioManualExpression.module.css';
import { usePropState } from '@studio/hooks';
import type { ExpressionTexts } from '../StudioExpression';

export type StudioManualExpressionProps = {
  expression: Expression;
  onValidExpressionChange: (expression: Expression) => void;
  onValidityChange: (isValid: boolean) => void;
  texts: ExpressionTexts;
};

export const StudioManualExpression = ({
  expression: givenExpression,
  onValidExpressionChange,
  onValidityChange,
  texts,
}: StudioManualExpressionProps): React.ReactElement => {
  const initialExpressionString = expressionToString(givenExpression);
  const isInitiallyValid = isStringValidAsExpression(initialExpressionString);
  const [expressionString, setExpressionString] = usePropState<string>(initialExpressionString);
  const [isValid, setIsValid] = useState<boolean>(isInitiallyValid);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    const { value } = event.target;
    setExpressionString(value);
    const isStringValid = isStringValidAsExpression(value);
    setIsValid(isStringValid);
    onValidityChange(isStringValid);

    if (isStringValid) {
      const expression = stringToExpression(value);
      onValidExpressionChange(expression);
    }
  };

  const errorMessage = isValid ? undefined : texts.cannotSaveSinceInvalid;

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
