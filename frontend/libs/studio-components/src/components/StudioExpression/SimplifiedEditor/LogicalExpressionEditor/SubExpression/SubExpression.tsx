import React, { useContext, useEffect, useState } from 'react';
import type { SimpleSubExpression } from '../../../types/SimpleSubExpression';
import type { RelationalOperator } from '../../../types/RelationalOperator';
import {
  changeFirstOperand,
  changeRelationalOperator,
  changeSecondOperand,
} from './utils/changeSubExpressionUtils';
import type { SimpleSubExpressionValue } from '../../../types/SimpleSubExpressionValue';
import { RelationalOperatorSelector } from './RelationalOperatorSelector';
import { SubExpressionValueSelector } from './SubExpressionValueSelector';
import classes from './SubExpression.module.css';
import { SubExpressionToolbar } from './SubExpressionToolbar';
import cn from 'classnames';
import type { ExpressionErrorKey } from '../../../enums/ExpressionErrorKey';
import { findSubExpressionErrors } from './utils/findSubExpressionErrors';
import { SubExpressionErrors } from './SubExpressionErrors';
import { Fieldset } from '@digdir/design-system-react';
import { StudioExpressionContext } from '../../../StudioExpressionContext';

export type SubExpressionProps = {
  expression: SimpleSubExpression;
  legend: string;
  onChange: (subExpression: SimpleSubExpression) => void;
  onDelete: () => void;
};

export const SubExpression = ({ expression, legend, onChange, onDelete }: SubExpressionProps) => {
  const { texts } = useContext(StudioExpressionContext);
  const [isInEditMode, setIsInEditMode] = useState<boolean>(false);
  const [expressionState, setExpressionState] = useState<SimpleSubExpression>(expression);
  const [errors, setErrors] = useState<ExpressionErrorKey[]>([]);

  useEffect(() => {
    setExpressionState(expression);
  }, [expression]);

  const handleChange = (subExpression: SimpleSubExpression) => {
    setExpressionState(subExpression);
  };

  const handleSave = () => {
    const errorList = findSubExpressionErrors(expressionState);
    setErrors(errorList);
    if (!errorList.length) {
      onChange(expressionState);
      setIsInEditMode(false);
    }
  };

  const handleEnableEditMode = () => {
    setIsInEditMode(true);
  };

  const handleOperatorChange = (operator: RelationalOperator) =>
    handleChange(changeRelationalOperator(expressionState, operator));

  const handleFirstValueChange = (value: SimpleSubExpressionValue) =>
    handleChange(changeFirstOperand(expressionState, value));

  const handleSecondValueChange = (value: SimpleSubExpressionValue) =>
    handleChange(changeSecondOperand(expressionState, value));

  const className = cn(
    classes.subExpression,
    isInEditMode && classes.editMode,
    errors.length && classes.hasError,
  );

  return (
    <Fieldset
      className={className}
      error={!!errors.length && <SubExpressionErrors errorKeys={errors} />}
      hideLegend
      legend={legend}
    >
      <div className={classes.fieldsetContent}>
        <SubExpressionValueSelector
          className={classes.editableItem}
          isInEditMode={isInEditMode}
          legend={texts.firstOperand}
          onChange={handleFirstValueChange}
          value={expressionState.firstOperand}
        />
        <RelationalOperatorSelector
          className={classes.editableItem}
          isInEditMode={isInEditMode}
          onChange={handleOperatorChange}
          operator={expressionState.relationalOperator}
        />
        <SubExpressionValueSelector
          className={classes.editableItem}
          isInEditMode={isInEditMode}
          legend={texts.secondOperand}
          onChange={handleSecondValueChange}
          value={expressionState.secondOperand}
        />
        <SubExpressionToolbar
          isInEditMode={isInEditMode}
          onDelete={onDelete}
          onSave={handleSave}
          onEnableEditMode={handleEnableEditMode}
        />
      </div>
    </Fieldset>
  );
};
