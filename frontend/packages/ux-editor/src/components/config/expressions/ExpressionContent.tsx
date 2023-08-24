import React from 'react';
import { Button, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  ExpressionElement,
  expressionFunctionTexts,
  Operator,
} from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';
import { useTranslation } from 'react-i18next';
import { DataSourceValue } from './DataSourceValue';
import { addDataSource, addDataSourceValue } from "../../../utils/dynamicsUtils";

interface IExpressionContentProps {
  expressionAction: boolean;
  expressionElement: ExpressionElement;
  dynamicOperator?: Operator;
  onAddExpressionElement: (expOp: string) => void;
  onUpdateExpressionElement: (expressionElement: ExpressionElement) => void;
  onUpdateDynamicOperator: (dynamicOp: Operator) => void;
  onRemoveExpressionElement: (expressionElement: ExpressionElement) => void;
}

export const ExpressionContent = ({
    expressionAction,
    expressionElement,
    dynamicOperator,
    onAddExpressionElement,
    onUpdateExpressionElement,
    onUpdateDynamicOperator,
    onRemoveExpressionElement,
}: IExpressionContentProps) => {
  const { t } = useTranslation();

  const showAddExpressionButton: boolean = !dynamicOperator;
  const allowToSpecifyExpression = expressionAction && Object.values(ExpressionFunction).includes(expressionElement.function as ExpressionFunction);

  const addFunctionToExpressionElement = (func: string) => {
    expressionElement.function = func as ExpressionFunction;
    handleUpdateExpressionElement();
  };

  const addDataSourceToDynamic = (dataSource: string, isComparable: boolean ) => {
    const newExpressionElement = addDataSource(expressionElement, dataSource, isComparable);
    expressionElement = { ...newExpressionElement };
    handleUpdateExpressionElement();
  };

  const addDataSourceValueToDynamic = (dataSourceValue: string, isComparable: boolean) => {
    const newExpressionElement = addDataSourceValue(expressionElement, dataSourceValue, isComparable);
    expressionElement = { ...newExpressionElement };
    handleUpdateExpressionElement();
  };

  const handleUpdateDynamicOperator = (operator: Operator) => {
    onUpdateDynamicOperator(operator);
  };

  const handleAddExpressionElement = (expressionOperator: Operator) => {
    onAddExpressionElement(expressionOperator);
  };

  const handleUpdateExpressionElement = () => {
    onUpdateExpressionElement(expressionElement);
  };

  const handleRemoveExpressionElement = () => {
    onRemoveExpressionElement(expressionElement);
  };

  return (
    <div>
      <p>{t('right_menu.dynamics_function_on_action')}</p>
      <Select // TODO: Consider only representing the function selection between the data source dropdowns - where it is actually used. Issue: #10858
        onChange={(func: string) => addFunctionToExpressionElement(func)}
        options={[{ label: 'Velg oppsett...', value: 'default' }].concat(
          Object.values(ExpressionFunction).map((func: string) => ({
            label: expressionFunctionTexts(t)[func],
            value: func,
          }))
        )}
        value={expressionElement.function || 'default'}
      />
      {allowToSpecifyExpression && (
        <>
          <div className={classes.expression}>
            <Button
              className={classes.expressionDeleteButton}
              color='danger'
              icon={<XMarkIcon />}
              onClick={handleRemoveExpressionElement}
              variant='quiet'
              size='small'
            />
            <div className={classes.expressionDetails}>
              <Select
                onChange={(dataSource: string) => addDataSourceToDynamic(dataSource, false)}
                options={[{ label: 'Velg...', value: 'default' }].concat(
                  Object.values(DataSource).map((ds: string) => ({
                    label: expressionDataSourceTexts(t)[ds],
                    value: ds,
                  }))
                )}
                value={expressionElement.dataSource || 'default'}
              />
              {expressionElement.dataSource && (
                <DataSourceValue
                  expressionElement={expressionElement}
                  currentDataSource={expressionElement.dataSource as DataSource}
                  specifyDataSourceValue={(dataSourceValue ) => addDataSourceValueToDynamic(dataSourceValue, false)}
                  isComparableValue={false}
                />
              )}
              <p className={classes.expressionFunction}>
                {expressionFunctionTexts(t)[expressionElement.function]}
              </p>
              <Select
                onChange={(compDataSource: string) =>
                  addDataSourceToDynamic(compDataSource, true)
                }
                options={[{ label: 'Velg...', value: 'default' }].concat(
                  Object.values(DataSource).map((cds: string) => ({
                    label: expressionDataSourceTexts(t)[cds],
                    value: cds,
                  }))
                )}
                value={expressionElement.comparableDataSource || 'default'}
              />
              {expressionElement.comparableDataSource && (
                <DataSourceValue
                  expressionElement={expressionElement}
                  currentDataSource={expressionElement.comparableDataSource as DataSource}
                  specifyDataSourceValue={(dataSourceValue) => addDataSourceValueToDynamic(dataSourceValue, true)}
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
                  onClick={() => handleAddExpressionElement(dynamicOperator || Operator.And)}
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
                  onChange={(value) => handleUpdateDynamicOperator(value as Operator)}
                  selectedValue={dynamicOperator || Operator.And}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
