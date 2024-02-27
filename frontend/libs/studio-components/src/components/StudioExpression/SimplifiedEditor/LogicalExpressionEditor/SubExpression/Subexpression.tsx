import React, { useContext, useEffect, useState } from 'react';
import type { SimpleSubexpression } from '../../../types/SimpleSubexpression';
import type { RelationalOperator } from '../../../types/RelationalOperator';
import {
  changeFirstOperand,
  changeRelationalOperator,
  changeSecondOperand,
} from './utils/changeSubexpressionUtils';
import type { SimpleSubexpressionValue } from '../../../types/SimpleSubexpressionValue';
import { RelationalOperatorSelector } from './RelationalOperatorSelector';
import { SubexpressionValueSelector } from './SubExpressionValueSelector';
import classes from './Subexpression.module.css';
import { SubexpressionToolbar } from './SubExpressionToolbar';
import cn from 'classnames';
import type { ExpressionErrorKey } from '../../../enums/ExpressionErrorKey';
import { findSubexpressionErrors } from './utils/findSubexpressionErrors';
import { SubexpressionErrors } from './SubExpressionErrors';
import { Fieldset } from '@digdir/design-system-react';
import { StudioExpressionContext } from '../../../StudioExpressionContext';

export type SubexpressionProps = {
  expression: SimpleSubexpression;
  legend: string;
  onChange: (subexpression: SimpleSubexpression) => void;
  onDelete: () => void;
};

export const Subexpression = ({ expression, legend, onChange, onDelete }: SubexpressionProps) => {
  const { texts } = useContext(StudioExpressionContext);
  const [isInEditMode, setIsInEditMode] = useState<boolean>(false);
  const [expressionState, setExpressionState] = useState<SimpleSubexpression>(expression);
  const [errors, setErrors] = useState<ExpressionErrorKey[]>([]);

  useEffect(() => {
    setExpressionState(expression);
  }, [expression]);

  const handleChange = (subexpression: SimpleSubexpression) => {
    setExpressionState(subexpression);
  };

  const handleSave = () => {
    const errorList = findSubexpressionErrors(expressionState);
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

  const handleFirstValueChange = (value: SimpleSubexpressionValue) =>
    handleChange(changeFirstOperand(expressionState, value));

  const handleSecondValueChange = (value: SimpleSubexpressionValue) =>
    handleChange(changeSecondOperand(expressionState, value));

  const className = cn(
    classes.subexpression,
    isInEditMode && classes.editMode,
    errors.length && classes.hasError,
  );

  return (
    <Fieldset className={className} hideLegend legend={legend}>
      <div className={classes.fieldsetContent}>
        <SubexpressionValueSelector
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
        <SubexpressionValueSelector
          className={classes.editableItem}
          isInEditMode={isInEditMode}
          legend={texts.secondOperand}
          onChange={handleSecondValueChange}
          value={expressionState.secondOperand}
        />
        <SubexpressionToolbar
          isInEditMode={isInEditMode}
          onDelete={onDelete}
          onSave={handleSave}
          onEnableEditMode={handleEnableEditMode}
        />
        {!!errors.length && <SubexpressionErrors errorKeys={errors} />}
      </div>
    </Fieldset>
  );
};
