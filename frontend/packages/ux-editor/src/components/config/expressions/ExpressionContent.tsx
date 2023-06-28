import React from 'react';
import {Button, ButtonColor, ButtonVariant, Select, ToggleButtonGroup} from '@digdir/design-system-react';
import {ExpressionFunction} from '../../../types/Expressions';
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
  id?: string;
  expressionOperatorForPrevExpression?: 'og' | 'eller' | null; // Or is it for the next expression?
  function?: ExpressionFunction;
  dataSource?: string;
  value?: string;
  comparableDataSource?: string;
  comparableValue?: string;
}

// change name to CreateExpressionElement?
export const ExpressionContent = ({expressionAction, expressionElement, onAddExpressionElement, onUpdateExpressionElement, onRemoveExpressionElement}: IExpressionContentProps) => {
  const [selectedDataSource, setSelectedDataSource] = React.useState<string>('Velg alternativ');
  const [selectedValue, setSelectedValue] = React.useState<string>('Velg alternativ');
  const [selectedComparableDataSource, setSelectedComparableDataSource] = React.useState<string>('Velg alternativ');
  const [selectedComparableValue, setSelectedComparableValue] = React.useState<string>('Velg alternativ');
  const [selectedFunction, setSelectedFunction] = React.useState<string>('Velg oppsett');
  const [showAddExpressionButton, setShowAddExpressionButton] = React.useState<boolean>(true);

  const allowToSpecifyExpression = expressionAction && Object.values(ExpressionFunction).includes(selectedFunction as ExpressionFunction);

  // Update expressionElement directly in render?
  const addFunctionToExpressionElement = (func: string) => {
    setSelectedFunction(func);
    expressionElement.function = func as ExpressionFunction;
    handleUpdateExpressionElement();
  }

  const addTriggerDataSource = (dataSource: string) => {
    setSelectedDataSource(dataSource);
    expressionElement.dataSource = dataSource;
    handleUpdateExpressionElement();
  };

  const specifyTriggerDataSource = (dataSourceKind: string) => {
    setSelectedValue(dataSourceKind);
    expressionElement.value = dataSourceKind;
    handleUpdateExpressionElement();
  };

  const addComparableTriggerDataSource = (compDataSource: string) => {
    setSelectedComparableDataSource(compDataSource);
    expressionElement.comparableDataSource = compDataSource;
    handleUpdateExpressionElement();
  };

  const specifyComparableTriggerDataSource = (compDataSourceKind: string) => {
    setSelectedComparableValue(compDataSourceKind);
    expressionElement.comparableValue = compDataSourceKind;
    handleUpdateExpressionElement();
  };

  const addExpressionOperatorForPrevExpression = (operator: 'og' | 'eller') => {
    // if first expressionElement in list no operator should be added
    expressionElement.expressionOperatorForPrevExpression = operator;
    handleUpdateExpressionElement();
  };

  const handleAddExpressionElement = () => {
    setShowAddExpressionButton(!showAddExpressionButton);
    onAddExpressionElement();
  }

  const handleUpdateExpressionElement = () => {
    onUpdateExpressionElement(expressionElement);
  };

  const handleRemoveExpressionElement = () => {
    setSelectedFunction('Velg oppsett');
    setSelectedDataSource('Velg alternativ');
    setSelectedComparableDataSource('Velg alternativ');
    setShowAddExpressionButton(true);
    onRemoveExpressionElement(expressionElement);
  }

  return (
    <div>
      <span>Velg oppsettet for uttrykket du vil lage</span>
      <Select
        onChange={(func: string) => addFunctionToExpressionElement(func)}
        options={Object.values(ExpressionFunction).map((func: string) => ({label: func, value: func}))}
        value={expressionElement.function && selectedFunction}
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
              {label: 'komponent', value: 'Komponent'},
              {label: 'datamodell', value: 'Datamodell'}
            ]}
            value={expressionElement.dataSource && selectedDataSource} // Is it necessary with the first check?
          />
          {selectedDataSource &&
            <Select
              onChange={(dataSourceKind: string) => specifyTriggerDataSource(dataSourceKind)}
              options={[
                {label: 'alder', value: 'Alder'},
                {label: 'fornavn', value: 'Fornavn'}
              ]}
              value={selectedValue}
            />}
          <span>{selectedFunction}</span>
          <Select
            onChange={(compDataSource: string) => addComparableTriggerDataSource(compDataSource)}
            options={[
              {label: 'komponent', value: 'Komponent'},
              {label: 'datamodell', value: 'Datamodell'}
            ]}
            value={expressionElement.value && selectedComparableDataSource} // Is it necessary with the first check?
          />
          {selectedComparableDataSource &&
            <Select
              onChange={(compDataSourceKind: string) => specifyComparableTriggerDataSource(compDataSourceKind)}
              options={[
                {label: 'alder', value: 'Alder'},
                {label: 'fornavn', value: 'Fornavn'}
              ]}
              value={selectedComparableValue}
            />}
          {!expressionElement.expressionOperatorForPrevExpression && showAddExpressionButton ? (
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
                {label: 'og', value: 'Og'},
                {label: 'eller', value: 'Eller'}
                ]}
                onChange={(value) => addExpressionOperatorForPrevExpression(value as 'og' | 'eller')}
                selectedValue={expressionElement.expressionOperatorForPrevExpression} // or Og?
              />)
          }
        </div>
      }
    </div>
  )
}
