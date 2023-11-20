import React from 'react';
import { Button, Select } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  SubExpression,
  expressionFunctionTexts,
} from '../../../../../types/Expressions';
import { TrashIcon } from '@navikt/aksel-icons';
import classes from './SubExpressionContent.module.css';
import { DataSourceValue } from './DataSourceValue';
import { addDataSource, addDataSourceValue } from '../../../../../utils/expressionsUtils';
import { useText } from '../../../../../hooks';

export interface SubExpressionContentProps {
  subExpression: SubExpression;
  onUpdateSubExpression: (subExpression: SubExpression) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
}

export const SubExpressionContent = ({
  subExpression,
  onUpdateSubExpression,
  onRemoveSubExpression,
}: SubExpressionContentProps) => {
  const t = useText();

  const allowToSpecifyExpression = Object.values(ExpressionFunction).includes(
    subExpression.function as ExpressionFunction,
  );

  const addFunctionToSubExpression = (func: string) => {
    if (func === 'default') {
      delete subExpression.function;
    } else {
      subExpression.function = func as ExpressionFunction;
    }
    onUpdateSubExpression(subExpression);
  };

  const addDataSourceToExpression = (dataSource: string, isComparable: boolean) => {
    const newSubExpression = addDataSource(subExpression, dataSource, isComparable);
    onUpdateSubExpression(newSubExpression);
  };

  const addDataSourceValueToExpression = (dataSourceValue: string, isComparable: boolean) => {
    const newSubExpression = addDataSourceValue(subExpression, dataSourceValue, isComparable);
    onUpdateSubExpression(newSubExpression);
  };

  return (
    <>
      <div className={classes.subExpressionTop}>
        <p>{t('right_menu.expressions_function_on_property')}</p>
        <Button
          title={t('general.delete')}
          color='danger'
          icon={<TrashIcon />}
          onClick={() => onRemoveSubExpression(subExpression)}
          variant='tertiary'
          size='small'
        />
      </div>
      <Select // TODO: Consider only representing the function selection between the data source dropdowns - where it is actually used. Issue: #10858
        label={t('right_menu.expressions_function')}
        hideLabel={true}
        onChange={(func: string) => addFunctionToSubExpression(func)}
        options={[{ label: t('right_menu.expressions_function_select'), value: 'default' }].concat(
          Object.values(ExpressionFunction).map((func: string) => ({
            label: expressionFunctionTexts(t)[func],
            value: func,
          })),
        )}
        value={subExpression.function || 'default'}
      />
      {allowToSpecifyExpression && (
        <div className={classes.subExpression}>
          <Select
            label={t('right_menu.expressions_data_source')}
            hideLabel={true}
            onChange={(dataSource: string) => addDataSourceToExpression(dataSource, false)}
            options={[
              { label: t('right_menu.expressions_data_source_select'), value: 'default' },
            ].concat(
              Object.values(DataSource).map((ds: string) => ({
                label: expressionDataSourceTexts(t)[ds],
                value: ds,
              })),
            )}
            value={subExpression.dataSource || 'default'}
          />
          {subExpression.dataSource && (
            <DataSourceValue
              subExpression={subExpression}
              currentDataSource={subExpression.dataSource as DataSource}
              specifyDataSourceValue={(dataSourceValue) =>
                addDataSourceValueToExpression(dataSourceValue, false)
              }
              isComparableValue={false}
            />
          )}
          <p className={classes.expressionFunction}>
            {expressionFunctionTexts(t)[subExpression.function]}
          </p>
          <Select
            label={t('right_menu.expressions_comparable_data_source')}
            hideLabel={true}
            onChange={(compDataSource: string) => addDataSourceToExpression(compDataSource, true)}
            options={[
              { label: t('right_menu.expressions_data_source_select'), value: 'default' },
            ].concat(
              Object.values(DataSource).map((cds: string) => ({
                label: expressionDataSourceTexts(t)[cds],
                value: cds,
              })),
            )}
            value={subExpression.comparableDataSource || 'default'}
          />
          {subExpression.comparableDataSource && (
            <DataSourceValue
              subExpression={subExpression}
              currentDataSource={subExpression.comparableDataSource as DataSource}
              specifyDataSourceValue={(dataSourceValue) =>
                addDataSourceValueToExpression(dataSourceValue, true)
              }
              isComparableValue={true}
            />
          )}
        </div>
      )}
    </>
  );
};
