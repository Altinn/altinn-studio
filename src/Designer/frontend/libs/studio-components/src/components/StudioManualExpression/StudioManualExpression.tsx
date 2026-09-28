import React, { useState } from 'react';
import type { Expression } from '../StudioExpression/types/Expression';
import { isStringValidAsExpression } from '../StudioExpression/validators/isStringValidAsExpression';
import { expressionToString, stringToExpression } from './converters';
import { StudioTextarea } from '../StudioTextarea';
import classes from './StudioManualExpression.module.css';
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
  const [expressionString, setExpressionString] = useState<string>(initialExpressionString);
  const [isValid, setIsValid] = useState<boolean>(isInitiallyValid);
  const [previousExpression, setPreviousExpression] = useState<Expression>(givenExpression);

  if (givenExpression !== previousExpression) {
    setPreviousExpression(givenExpression);
    if (!representsExpression(expressionString, givenExpression)) {
      setExpressionString(initialExpressionString);
    }
  }

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

  const handleBlur = (): void => {
    if (isStringValidAsExpression(expressionString)) {
      setExpressionString(expressionToString(stringToExpression(expressionString)));
    }
  };

  const errorMessage = isValid ? undefined : texts.cannotSaveSinceInvalid;

  return (
    <StudioTextarea
      aria-label={texts.expression}
      className={classes.manualEditor}
      error={errorMessage}
      onBlur={handleBlur}
      onChange={handleChange}
      rows={12}
      value={expressionString}
    />
  );
};

const representsExpression = (str: string, expression: Expression): boolean =>
  isStringValidAsExpression(str) &&
  JSON.stringify(stringToExpression(str)) === JSON.stringify(expression);
