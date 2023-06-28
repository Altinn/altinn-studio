import React from 'react';
import { Button, ButtonColor, ButtonVariant, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import { ExpressionFunction } from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';

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
export const ExpressionContent = ({ expressionAction, expressionElement, onAddExpressionElement, onUpdateExpressionElement, onRemoveExpressionElement }: IExpressionContentProps) => {
  const [showAddExpressionButton, setShowAddExpressionButton] = React.useState<boolean>(true);

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
      <span>Velg oppsettet for uttrykket du vil lage</span>
      <Select
        onChange={(func: string) => addFunctionToExpressionElement(func)}
        options={Object.values(ExpressionFunction).map((func: string) => ({ label: func, value: func }))}
        value={expressionElement.function || 'Velg oppsett...'}
        searchLabel={'Velg...'}
      />
      {allowToSpecifyExpression &&
        <div>
          <Button
            color={ButtonColor.Danger}
            icon={<XMarkIcon />}
            onClick={handleRemoveExpressionElement}
            variant={ButtonVariant.Quiet}
          />
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
          <span>{expressionElement.function}</span>
          <Select
            // Should be possible to enter custom values for the comparables
            onChange={(compDataSource: string) => addComparableTriggerDataSource(compDataSource)}
            options={[
              { label: 'Velg...', value: 'default' },
              { label: 'Komponent', value: 'komponent' },
              { label: 'Datamodell', value: 'datamodell' }
            ]}
            value={expressionElement.comparableDataSource || 'default'} // Is it necessary with the first check?
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
          {!expressionElement.expressionOperatorForNextExpression || showAddExpressionButton ? (
              <Button
                variant="quiet"
                onClick={handleAddExpressionElement}
              >
                <i
                  className={cn('fa', classes.plusIcon, {
                    'fa-circle-plus': showAddExpressionButton,
                    'fa-circle-plus-outline': !showAddExpressionButton,
                  })}
                />
                Legg til uttrykk
              </Button>)
            : (
              <ToggleButtonGroup
                items={[
                { label: 'Og', value: 'og' },
                { label: 'Eller', value: 'eller' }
                ]}
                onChange={(value) => addExpressionOperatorForPrevExpression(value as 'og' | 'eller')}
                selectedValue={expressionElement.expressionOperatorForNextExpression || 'og'}
              />)
          }
        </div>
      }
    </div>
  )
}
