import React, { useEffect, useState } from 'react';
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
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { StudioFieldset } from '../../../../StudioFieldset';
import type { FieldsetProps } from '@digdir/designsystemet-react';

export type SubexpressionProps = {
  expression: SimpleSubexpression;
  legend: string;
  onChange: (subexpression: SimpleSubexpression) => void;
  onDelete: () => void;
};

export const Subexpression = ({
  expression,
  legend,
  onChange,
  onDelete,
}: SubexpressionProps): React.ReactElement => {
  const { texts, dataLookupOptions } = useStudioExpressionContext();
  const [isInEditMode, setIsInEditMode] = useState<boolean>(false);
  const [expressionState, setExpressionState] = useState<SimpleSubexpression>(expression);
  const [errors, setErrors] = useState<ExpressionErrorKey[]>(
    findSubexpressionErrors(expression, dataLookupOptions),
  );

  useEffect(() => {
    setExpressionState(expression);
  }, [expression]);

  const handleChange = (subexpression: SimpleSubexpression): void => {
    setExpressionState(subexpression);
  };

  const handleSave = (): void => {
    const errorList = findSubexpressionErrors(expressionState, dataLookupOptions);
    setErrors(errorList);
    if (!errorList.length) {
      onChange(expressionState);
      setIsInEditMode(false);
    }
  };

  const handleEnableEditMode = (): void => {
    setIsInEditMode(true);
  };

  const handleOperatorChange = (operator: RelationalOperator): void =>
    handleChange(changeRelationalOperator(expressionState, operator));

  const handleFirstValueChange = (value: SimpleSubexpressionValue): void =>
    handleChange(changeFirstOperand(expressionState, value));

  const handleSecondValueChange = (value: SimpleSubexpressionValue): void =>
    handleChange(changeSecondOperand(expressionState, value));

  const className = cn(
    classes.subexpression,
    isInEditMode && classes.editMode,
    errors.length && classes.hasError,
  );

  const dataColour: FieldsetProps['data-color'] = errors.length ? 'danger' : 'neutral';

  return (
    <StudioFieldset className={className} hideLegend legend={legend} data-color={dataColour}>
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
        {!!errors.length && isInEditMode && <SubexpressionErrors errorKeys={errors} />}
      </div>
    </StudioFieldset>
  );
};
