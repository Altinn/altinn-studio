import React, { type ChangeEvent } from 'react';
import type { SubExpression } from '../../../../../../types/Expressions';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  expressionFunctionTexts,
} from '../../../../../../types/Expressions';
import { TrashIcon } from '@studio/icons';
import classes from './SubExpressionContent.module.css';
import { DataSourceValue } from './DataSourceValue';
import {
  addDataSourceToSubExpression,
  addDataSourceValueToSubExpression,
  addFunctionToSubExpression,
} from '../../../../../../utils/expressionsUtils';
import { useText } from '../../../../../../hooks';
import { StudioButton, StudioSelect } from '@studio/components';

export interface SubExpressionContentProps {
  subExpression: SubExpression;
  onUpdateSubExpression: (subExpression: SubExpression) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
}

export const SubExpressionContent = (
  { subExpression, onUpdateSubExpression, onRemoveSubExpression }: SubExpressionContentProps,
  index,
) => {
  const t = useText();

  const allowToSpecifyExpression = Object.values(ExpressionFunction).includes(
    subExpression.function as ExpressionFunction,
  );

  const addFunction = (func: string) => {
    const newSubExpression = addFunctionToSubExpression(subExpression, func);
    onUpdateSubExpression(newSubExpression);
  };

  const addDataSource = (dataSource: string, isComparable: boolean) => {
    const newSubExpression = addDataSourceToSubExpression(subExpression, dataSource, isComparable);
    onUpdateSubExpression(newSubExpression);
  };

  const addDataSourceValue = (dataSourceValue: string, isComparable: boolean) => {
    const newSubExpression = addDataSourceValueToSubExpression(
      subExpression,
      dataSourceValue,
      isComparable,
    );
    onUpdateSubExpression(newSubExpression);
  };

  return (
    <>
      <div className={classes.subExpressionTop}>
        <p>{t('right_menu.expressions_function_on_property')}</p>
        <StudioButton
          title={t('right_menu.expression_sub_expression_delete')}
          color='danger'
          onClick={() => onRemoveSubExpression(subExpression)}
          variant='tertiary'
          icon={<TrashIcon />}
        />
      </div>
      <StudioSelect // TODO: Consider only representing the function selection between the data source dropdowns - where it is actually used. Issue: #10858
        label={t('right_menu.expressions_function')}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => addFunction(event.target.value)}
        value={subExpression.function || 'default'}
      >
        <StudioSelect.Option value='default'>
          {t('right_menu.expressions_function_select')}
        </StudioSelect.Option>
        {Object.values(ExpressionFunction).map((func: string) => (
          <StudioSelect.Option key={func} value={func}>
            {expressionFunctionTexts(t)[func]}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {allowToSpecifyExpression && (
        <div className={classes.subExpression}>
          <StudioSelect
            label={t('right_menu.expressions_data_source')}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              addDataSource(event.target.value, false)
            }
            value={subExpression.dataSource || 'default'}
          >
            <StudioSelect.Option value='default'>
              {t('right_menu.expressions_data_source_select')}
            </StudioSelect.Option>
            {Object.values(DataSource).map((ds: string) => (
              <StudioSelect.Option key={ds} value={ds}>
                {expressionDataSourceTexts(t)[ds]}
              </StudioSelect.Option>
            ))}
          </StudioSelect>
          {subExpression.dataSource && (
            <DataSourceValue
              subExpression={subExpression}
              currentDataSource={subExpression.dataSource as DataSource}
              specifyDataSourceValue={(dataSourceValue) =>
                addDataSourceValue(dataSourceValue, false)
              }
              isComparableValue={false}
            />
          )}
          <p className={classes.expressionFunction}>
            {expressionFunctionTexts(t)[subExpression.function]}
          </p>
          <StudioSelect
            label={t('right_menu.expressions_comparable_data_source')}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              addDataSource(event.target.value, true)
            }
            value={subExpression.comparableDataSource || 'default'}
          >
            <StudioSelect.Option value='default'>
              {t('right_menu.expressions_data_source_select')}
            </StudioSelect.Option>
            {Object.values(DataSource).map((cds: string) => (
              <StudioSelect.Option key={cds} value={cds}>
                {expressionDataSourceTexts(t)[cds]}
              </StudioSelect.Option>
            ))}
          </StudioSelect>
          {subExpression.comparableDataSource && (
            <DataSourceValue
              subExpression={subExpression}
              currentDataSource={subExpression.comparableDataSource as DataSource}
              specifyDataSourceValue={(dataSourceValue) =>
                addDataSourceValue(dataSourceValue, true)
              }
              isComparableValue={true}
            />
          )}
        </div>
      )}
    </>
  );
};
