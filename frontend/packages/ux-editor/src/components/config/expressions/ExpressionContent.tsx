import React from 'react';
import { Button, ButtonColor, ButtonVariant, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import { ExpressionFunction, expressionFunctionTexts } from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';
import { useTranslation } from 'react-i18next';

export interface IExpressionContentProps {
  expressionAction: boolean;
  expressionElement: ExpressionElement;
  onAddExpressionElement: () => void;
  onUpdateExpressionElement: (expressionElement: ExpressionElement) => void;
  onRemoveExpressionElement: (expressionElement: ExpressionElement) => void;
}

export interface ExpressionElement {
  id: string;
  expressionOperatorForNextExpression?: 'og' | 'eller';
  function?: ExpressionFunction;
  dataSource?: string;
  value?: string;
  comparableDataSource?: string;
  comparableValue?: string;
}

// change name to CreateExpressionElement?
export const ExpressionContent = ({
                                    expressionAction,
                                    expressionElement,
                                    onAddExpressionElement,
                                    onUpdateExpressionElement,
                                    onRemoveExpressionElement
                                  }: IExpressionContentProps) => {
  const [showAddExpressionButton, setShowAddExpressionButton] = React.useState<boolean>(true);
  const { t } = useTranslation();

  const allowToSpecifyExpression = expressionAction && Object.values(ExpressionFunction).includes(expressionElement.function as ExpressionFunction);

  const addFunctionToExpressionElement = (func: string) => {
    expressionElement.function = func as ExpressionFunction;
    handleUpdateExpressionElement();
  }

  const addTriggerDataSource = (dataSource: string) => {
    expressionElement.dataSource = dataSource;
    handleUpdateExpressionElement();
  };

  const specifyTriggerDataSource = (dataSourceKind: string) => {
    expressionElement.value = dataSourceKind;
    handleUpdateExpressionElement();
  };

  const addComparableTriggerDataSource = (compDataSource: string) => {
    expressionElement.comparableDataSource = compDataSource;
    handleUpdateExpressionElement();
  };

  const specifyComparableTriggerDataSource = (compDataSourceKind: string) => {
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
  }

  const handleUpdateExpressionElement = () => {
    onUpdateExpressionElement(expressionElement);
  };

  const handleRemoveExpressionElement = () => {
    onRemoveExpressionElement(expressionElement);
  }

  return (
    <div>
      <p>{t('right_menu.dynamics_function_on_action')}</p>
      <Select
        onChange={(func: string) => addFunctionToExpressionElement(func)}
        options={[{ label: 'Velg oppsett...', value: 'default' }].concat(Object.values(ExpressionFunction).map((func: string) => ({ label: expressionFunctionTexts(t)[func], value: func })))}
        value={expressionElement.function || 'default'}
      />
      {allowToSpecifyExpression &&
        <>
          <div className={classes.expression}>
            <Button
              className={classes.expressionDeleteButton}
              color={ButtonColor.Danger}
              icon={<XMarkIcon/>}
              onClick={handleRemoveExpressionElement}
              variant={ButtonVariant.Quiet}
            />
            <div className={classes.expressionDetails}>
              <Select
                onChange={(dataSource: string) => addTriggerDataSource(dataSource)}
                options={[
                  { label: 'Velg...', value: 'default' },
                  { label: 'Komponent', value: 'komponent' },
                  { label: 'Datamodell', value: 'datamodell' }
                ]}
                value={expressionElement.dataSource || 'default'} // Is it necessary with the first check?
              />
              {expressionElement.dataSource &&
                <Select
                  onChange={(dataSourceKind: string) => specifyTriggerDataSource(dataSourceKind)}
                  options={[
                    { label: 'Velg...', value: 'default' },
                    { label: 'Alder', value: 'alder' },
                    { label: 'Fornavn', value: 'fornavn' }
                  ]}
                  value={expressionElement.value || 'default'}
                />}
              <p className={classes.expressionFunction}>{expressionFunctionTexts(t)[expressionElement.function]}</p>
              <Select
                // Should be possible to enter custom values for the comparables
                onChange={(compDataSource: string) => addComparableTriggerDataSource(compDataSource)}
                options={[
                  { label: 'Velg...', value: 'default' },
                  { label: 'Komponent', value: 'komponent' },
                  { label: 'Datamodell', value: 'datamodell' }
                ]}
                value={expressionElement.comparableDataSource || 'default'}
              />
              {expressionElement.comparableDataSource &&
                <Select
                  onChange={(compDataSourceKind: string) => specifyComparableTriggerDataSource(compDataSourceKind)}
                  options={[
                    { label: 'Velg...', value: 'default' },
                    { label: 'Alder', value: 'alder' },
                    { label: 'Fornavn', value: 'fornavn' }
                  ]}
                  value={expressionElement.comparableValue || 'default'}
                />}
            </div>
          </div>
          <div className={classes.addExpression}>
            {!expressionElement.expressionOperatorForNextExpression || showAddExpressionButton ? (
                <Button
                  variant='quiet'
                  onClick={handleAddExpressionElement}
                >
                  <i
                    className={cn('fa', classes.plusIcon, {
                      'fa-circle-plus': showAddExpressionButton,
                      'fa-circle-plus-outline': !showAddExpressionButton,
                    })}
                  />
                  {t('right_menu.dynamics_add_expression')}
                </Button>)
              : (
                <div className={classes.andOrToggleButtons}>
                <ToggleButtonGroup
                  items={[
                    { label: 'Og', value: 'og' },
                    { label: 'Eller', value: 'eller' }
                  ]}
                  onChange={(value) => addExpressionOperatorForPrevExpression(value as 'og' | 'eller')}
                  selectedValue={expressionElement.expressionOperatorForNextExpression || 'og'}
                />
                </div>
              )
            }
          </div>
        </>
      }
    </div>
  )
}
