import React from 'react';
import { Alert, Button, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  expressionFunctionTexts,
} from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';
import { useTranslation } from 'react-i18next';
import { DataSourceValue } from './DataSourceValue';

interface IExpressionContentProps {
  expressionAction: boolean;
  expressionElement: ExpressionElement;
  onAddExpressionElement: () => void;
  onUpdateExpressionElement: () => void;
  onRemoveExpressionElement: (expressionElement: ExpressionElement) => void;
}

export interface ExpressionElement {
  id: string;
  expressionOperatorForNextExpression?: 'og' | 'eller';
  function?: ExpressionFunction;
  dataSource?: DataSource;
  value?: string;
  comparableDataSource?: DataSource;
  comparableValue?: string;
}

// change name to CreateExpressionElement?
export const ExpressionContent = ({
  expressionAction,
  expressionElement,
  onAddExpressionElement,
  onUpdateExpressionElement,
  onRemoveExpressionElement,
}: IExpressionContentProps) => {
  const { t } = useTranslation();
  const [showAddExpressionButton, setShowAddExpressionButton] = React.useState<boolean>(true);
  const [duplicatedComponentIdsDiscovered, setDuplicatedComponentIdsDiscovered] =
    React.useState<boolean>(false);

  const allowToSpecifyExpression =
    expressionAction &&
    Object.values(ExpressionFunction).includes(expressionElement.function as ExpressionFunction);

  const addFunctionToExpressionElement = (func: string) => {
    expressionElement.function = func as ExpressionFunction;
    handleUpdateExpressionElement();
  };

  const addTriggerDataSource = (dataSource: string) => {
    if (dataSource === 'default') {
      delete expressionElement.dataSource;
      delete expressionElement.value;
      handleUpdateExpressionElement();
      return;
    }
    if (dataSource === DataSource.Null) {
      delete expressionElement.value;
    }
    expressionElement.dataSource = dataSource as DataSource;
    handleUpdateExpressionElement();
  };

  const specifyTriggerDataSource = (dataSourceKind: string) => {
    // TODO: Remove check for 'NotImplementedYet' when applicationSettings can be retrieved
    if (dataSourceKind === 'default' || dataSourceKind === 'NotImplementedYet') {
      delete expressionElement.value;
      handleUpdateExpressionElement();
      return;
    }
    expressionElement.value = dataSourceKind;
    handleUpdateExpressionElement();
  };

  const addComparableTriggerDataSource = (compDataSource: string) => {
    if (compDataSource === 'default') {
      delete expressionElement.comparableDataSource;
      delete expressionElement.comparableValue;
      handleUpdateExpressionElement();
      return;
    }
    if (compDataSource === DataSource.Null) {
      delete expressionElement.comparableValue;
    }
    expressionElement.comparableDataSource = compDataSource as DataSource;
    handleUpdateExpressionElement();
  };

  const specifyComparableTriggerDataSource = (compDataSourceKind: string) => {
    // TODO: Remove check for 'NotImplementedYet' when applicationSettings can be retrieved
    if (compDataSourceKind === 'default' || compDataSourceKind === 'NotImplementedYet') {
      delete expressionElement.comparableValue;
      handleUpdateExpressionElement();
      return;
    }
    expressionElement.comparableValue = compDataSourceKind;
    handleUpdateExpressionElement();
  };

  const addExpressionOperatorForPrevExpression = (operator: 'og' | 'eller') => {
    expressionElement.expressionOperatorForNextExpression = operator;
    handleUpdateExpressionElement();
  };

  const handleAddExpressionElement = () => {
    setShowAddExpressionButton(!showAddExpressionButton);
    expressionElement.expressionOperatorForNextExpression = 'og';
    onAddExpressionElement();
  };

  const handleUpdateExpressionElement = () => {
    if (
      expressionElement.dataSource !== DataSource.Component &&
      expressionElement.comparableDataSource !== DataSource.Component
    ) {
      setDuplicatedComponentIdsDiscovered(false);
    }
    onUpdateExpressionElement();
  };

  const handleRemoveExpressionElement = () => {
    onRemoveExpressionElement(expressionElement);
  };

  return (
    <div>
      <p>{t('right_menu.dynamics_function_on_action')}</p>
      <Select
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
                onChange={(dataSource: string) => addTriggerDataSource(dataSource)}
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
                  currentDataSource={expressionElement.dataSource}
                  specifyDataSourceValue={specifyTriggerDataSource}
                  isComparableValue={false}
                  onSetDuplicatedComponentIdsDiscovered={setDuplicatedComponentIdsDiscovered}
                />
              )}
              <p className={classes.expressionFunction}>
                {expressionFunctionTexts(t)[expressionElement.function]}
              </p>
              <Select
                onChange={(compDataSource: string) =>
                  addComparableTriggerDataSource(compDataSource)
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
                  currentDataSource={expressionElement.comparableDataSource}
                  specifyDataSourceValue={specifyComparableTriggerDataSource}
                  isComparableValue={true}
                  onSetDuplicatedComponentIdsDiscovered={setDuplicatedComponentIdsDiscovered}
                />
              )}
              {duplicatedComponentIdsDiscovered && (
                <Alert severity='warning'>
                  {t('right_menu.dynamics_duplicated_component_ids_warning')}
                </Alert>
              )}
            </div>
          </div>
          <div className={classes.addExpression}>
            {!expressionElement.expressionOperatorForNextExpression || showAddExpressionButton ? (
              <Button variant='quiet' onClick={handleAddExpressionElement} size='small'>
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
                    { label: 'Og', value: 'og' },
                    { label: 'Eller', value: 'eller' },
                  ]}
                  onChange={(value) =>
                    addExpressionOperatorForPrevExpression(value as 'og' | 'eller')
                  }
                  selectedValue={expressionElement.expressionOperatorForNextExpression || 'og'}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
