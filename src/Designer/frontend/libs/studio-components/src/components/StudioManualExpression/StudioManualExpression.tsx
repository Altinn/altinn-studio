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
  const givenExpressionString = expressionToString(givenExpression);
  const isInitiallyValid = isStringValidAsExpression(givenExpressionString);
  const [expressionString, setExpressionString] = useState<string>(givenExpressionString);
  const [isValid, setIsValid] = useState<boolean>(isInitiallyValid);
  const [prevExpressionString, setPrevExpressionString] = useState<string>(givenExpressionString);

  if (givenExpressionString !== prevExpressionString) {
    setPrevExpressionString(givenExpressionString);
    const isOwnChange =
      isValid && givenExpressionString === expressionToString(stringToExpression(expressionString));
    if (!isOwnChange) {
      setExpressionString(givenExpressionString);
      setIsValid(isInitiallyValid);
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
    if (isValid) {
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
