import React from 'react';
import { Button, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  SubExpression,
  expressionFunctionTexts,
  Operator, Expression,
} from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './SubExpressionContent.module.css';
import { DataSourceValue } from './DataSourceValue';
import { addDataSource, addDataSourceValue } from '../../../utils/expressionsUtils';
import { useText } from '../../../hooks';

interface IExpressionContentProps {
  expressionAction: boolean;
  subExpression: SubExpression;
  expression: Expression;
  index: number;
  onAddSubExpression: (expOp: string) => void;
  onUpdateSubExpression: (subExpression: SubExpression) => void;
  onUpdateExpressionOperator: (expressionOp: Operator) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
}

export const SubExpressionContent = ({
    expressionAction,
    subExpression,
    expression,
    index,
    onAddSubExpression,
    onUpdateSubExpression,
    onUpdateExpressionOperator,
    onRemoveSubExpression,
}: IExpressionContentProps) => {
  const t = useText();

  const showAddExpressionButton: boolean = index == expression.subExpressions.length - 1;
  const allowToSpecifyExpression = expressionAction && Object.values(ExpressionFunction).includes(subExpression.function as ExpressionFunction);

  const addFunctionToSubExpression = (func: string) => {
    subExpression.function = func as ExpressionFunction;
    handleUpdateSubExpression();
  };

  const addDataSourceToExpression = (dataSource: string, isComparable: boolean ) => {
    const newSubExpression = addDataSource(subExpression, dataSource, isComparable);
    subExpression = { ...newSubExpression };
    handleUpdateSubExpression();
  };

  const addDataSourceValueToExpression = (dataSourceValue: string, isComparable: boolean) => {
    const newSubExpression = addDataSourceValue(subExpression, dataSourceValue, isComparable);
    subExpression = { ...newSubExpression };
    handleUpdateSubExpression();
  };

  const handleUpdateExpressionOperator = (operator: Operator) => {
    onUpdateExpressionOperator(operator);
  };

  const handleAddSubExpression = (expressionOperator: Operator) => {
    onAddSubExpression(expressionOperator);
  };

  const handleUpdateSubExpression = () => {
    onUpdateSubExpression(subExpression);
  };

  const handleRemoveSubExpression = () => {
    onRemoveSubExpression(subExpression);
  };

  return (
    <div style={{border: '1px solid red'}}>
      <p>{t('right_menu.expressions_function_on_action')}</p>
      <Select // TODO: Consider only representing the function selection between the data source dropdowns - where it is actually used. Issue: #10858
        onChange={(func: string) => addFunctionToSubExpression(func)}
        options={[{ label: 'Velg oppsett...', value: 'default' }].concat(
          Object.values(ExpressionFunction).map((func: string) => ({
            label: expressionFunctionTexts(t)[func],
            value: func,
          }))
        )}
        value={subExpression.function || 'default'}
      />
      {allowToSpecifyExpression && (
        <>
          <div className={classes.expression}>
            <Button
              className={classes.expressionDeleteButton}
              color='danger'
              icon={<XMarkIcon />}
              onClick={handleRemoveSubExpression}
              variant='quiet'
              size='small'
            />
            <div className={classes.expressionDetails}>
              <Select
                onChange={(dataSource: string) => addDataSourceToExpression(dataSource, false)}
                options={[{ label: 'Velg...', value: 'default' }].concat(
                  Object.values(DataSource).map((ds: string) => ({
                    label: expressionDataSourceTexts(t)[ds],
                    value: ds,
                  }))
                )}
                value={subExpression.dataSource || 'default'}
              />
              {subExpression.dataSource && (
                <DataSourceValue
                  subExpression={subExpression}
                  currentDataSource={subExpression.dataSource as DataSource}
                  specifyDataSourceValue={(dataSourceValue ) => addDataSourceValueToExpression(dataSourceValue, false)}
                  isComparableValue={false}
                />
              )}
              <p className={classes.expressionFunction}>
                {expressionFunctionTexts(t)[subExpression.function]}
              </p>
              <Select
                onChange={(compDataSource: string) =>
                  addDataSourceToExpression(compDataSource, true)
                }
                options={[{ label: 'Velg...', value: 'default' }].concat(
                  Object.values(DataSource).map((cds: string) => ({
                    label: expressionDataSourceTexts(t)[cds],
                    value: cds,
                  }))
                )}
                value={subExpression.comparableDataSource || 'default'}
              />
              {subExpression.comparableDataSource && (
                <DataSourceValue
                  subExpression={subExpression}
                  currentDataSource={subExpression.comparableDataSource as DataSource}
                  specifyDataSourceValue={(dataSourceValue) => addDataSourceValueToExpression(dataSourceValue, true)}
                  isComparableValue={true}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
