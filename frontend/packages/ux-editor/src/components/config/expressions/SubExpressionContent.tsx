import React from 'react';
import { Button, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  SubExpression,
  expressionFunctionTexts,
  Operator,
} from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';
import { useTranslation } from 'react-i18next';
import { DataSourceValue } from './DataSourceValue';
import { addDataSource, addDataSourceValue } from '../../../utils/expressionsUtils';

interface IExpressionContentProps {
  expressionAction: boolean;
  subExpression: SubExpression;
  expressionOperator?: Operator;
  onAddSubExpression: (expOp: string) => void;
  onUpdateSubExpression: (subExpression: SubExpression) => void;
  onUpdateExpressionOperator: (expressionOp: Operator) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
}

export const SubExpressionContent = ({
    expressionAction,
    subExpression,
    expressionOperator,
    onAddSubExpression,
    onUpdateSubExpression,
    onUpdateExpressionOperator,
    onRemoveSubExpression,
}: IExpressionContentProps) => {
  const { t } = useTranslation();

  const showAddExpressionButton: boolean = !expressionOperator;
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
    <div>
      <p>{t('right_menu.dynamics_function_on_action')}</p>
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
          <div className={classes.addExpression}>
            {showAddExpressionButton ? (
                <Button
                  variant='quiet'
                  size='small'
                  onClick={() => handleAddSubExpression(expressionOperator || Operator.And)}
                >
                  <i
                    className={cn('fa', classes.plusIcon, {
                      'fa-circle-plus': showAddExpressionButton,
                      'fa-circle-plus-outline': !showAddExpressionButton,
                    })}
                  />
                  {t('right_menu.dynamics_add_expression')}
                </Button>
              ) : (
                <div className={classes.andOrToggleButtons}>
                <ToggleButtonGroup
                  items={[
                    { label: 'Og', value: Operator.And },
                    { label: 'Eller', value: Operator.Or }
                  ]}
                  onChange={(value) => handleUpdateExpressionOperator(value as Operator)}
                  selectedValue={expressionOperator || Operator.And}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
