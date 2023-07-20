import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, ButtonColor, ButtonVariant, Select, TextField, ToggleButtonGroup } from '@digdir/design-system-react';
import {
  DataSource,
  expressionDataSourceTexts,
  ExpressionFunction,
  expressionFunctionTexts
} from '../../../types/Expressions';
import { XMarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import classes from './ExpressionContent.module.css';
import { useTranslation } from 'react-i18next';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';

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
                                    onRemoveExpressionElement
                                  }: IExpressionContentProps) => {
  const [showAddExpressionButton, setShowAddExpressionButton] = React.useState<boolean>(true);
  const { t } = useTranslation();
  const { org, app } = useParams();
  const datamodelQuery = useDatamodelMetadataQuery(org, app);
  const dataModelElements = datamodelQuery?.data ?? [];

  const allowToSpecifyExpression = expressionAction && Object.values(ExpressionFunction).includes(expressionElement.function as ExpressionFunction);

  const addFunctionToExpressionElement = (func: string) => {
    expressionElement.function = func as ExpressionFunction;
    handleUpdateExpressionElement();
  }

  const addTriggerDataSource = (dataSource: string) => {
    if (dataSource === 'default') {
      delete expressionElement.dataSource
      delete expressionElement.value
      handleUpdateExpressionElement();
      return;
    }
    if (dataSource === DataSource.Null) {
      delete expressionElement.value;
    }
    expressionElement.dataSource = dataSource as DataSource
    handleUpdateExpressionElement();
  };

  const specifyTriggerDataSource = (dataSourceKind: string) => {
    expressionElement.value = dataSourceKind;
    handleUpdateExpressionElement();
  };

  const addComparableTriggerDataSource = (compDataSource: string) => {
    if (compDataSource === 'default') {
      delete expressionElement.comparableDataSource
      delete expressionElement.comparableValue
      handleUpdateExpressionElement();
      return;
    }
    if (compDataSource === DataSource.Null) {
      delete expressionElement.comparableValue;
    }
    expressionElement.comparableDataSource = compDataSource as DataSource
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

  const dataModelElementNames = dataModelElements
    .filter(element => element.dataBindingName)
    .map((element) => ({
      value: element.dataBindingName,
      label: element.dataBindingName,
    }));

  const getCorrespondingDataSourceValues = (dataSource: DataSource) => {
    switch (dataSource) {
      case DataSource.Component:
        // Should be an en endpoint for getting all components in a given layout set
        return ['comp0', 'comp1', 'comp2'].map((dsv: string) => ({ label: dsv, value: dsv }));
      case DataSource.DataModel:
        return dataModelElementNames;
      case DataSource.InstanceContext:
        return ['instanceOwnerPartyId', 'instanceId', 'appId'].map((dsv: string) => ({ label: dsv, value: dsv }));
      case DataSource.ApplicationSettings:
        // Should be an en endpoint for getting these settings
        return ['setting0', 'setting1', 'setting2'].map((dsv: string) => ({ label: dsv, value: dsv }));
      default:
        return [];
    }
  };

  const DataSourceValueComponent: React.FC<{ dataSource: DataSource; isComparableValue: boolean }> = ({ dataSource, isComparableValue }) => {
    switch (dataSource) {
      case DataSource.Component: case DataSource.DataModel: case DataSource.InstanceContext: case DataSource.ApplicationSettings:
        return (<Select
          onChange={(dataSourceValue: string) => isComparableValue ? specifyComparableTriggerDataSource(dataSourceValue) : specifyTriggerDataSource(dataSourceValue)}
          options={[{ label: 'Velg...', value: 'default' }].concat(getCorrespondingDataSourceValues(dataSource))}
          value={isComparableValue ? expressionElement.comparableValue : expressionElement.value || 'default'}
        />);
      case DataSource.String: case DataSource.Number:
        return (<TextField
          onChange={(e) => isComparableValue ? specifyComparableTriggerDataSource(e.target.value) : specifyTriggerDataSource(e.target.value)}
          value={isComparableValue ? expressionElement.comparableValue : expressionElement.value || ''}
        />);
      case DataSource.Boolean:
        return (<ToggleButtonGroup
          items={[
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' }
          ]}
          onChange={(value) => isComparableValue ? specifyComparableTriggerDataSource(value) : specifyTriggerDataSource(value)}
          selectedValue={isComparableValue ? expressionElement.comparableValue : expressionElement.value || 'true'}
        />);
      case DataSource.Null:
        return (<div></div>);
      default:
        return null;
    }
  };

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
                options={[{ label: 'Velg...', value: 'default' }].concat(Object.values(DataSource).map((ds: string) => ({ label: expressionDataSourceTexts(t)[ds], value: ds })))}
                value={expressionElement.dataSource || 'default'}
              />
              {expressionElement.dataSource &&
                <DataSourceValueComponent dataSource={expressionElement.dataSource} isComparableValue={false}/>}
              <p className={classes.expressionFunction}>{expressionFunctionTexts(t)[expressionElement.function]}</p>
              <Select
                onChange={(compDataSource: string) => addComparableTriggerDataSource(compDataSource)}
                options={[{ label: 'Velg...', value: 'default' }].concat(Object.values(DataSource).map((cds: string) => ({ label: expressionDataSourceTexts(t)[cds], value: cds })))}
                value={expressionElement.comparableDataSource || 'default'}
              />
              {expressionElement.comparableDataSource &&
                <DataSourceValueComponent dataSource={expressionElement.comparableDataSource} isComparableValue={true}/>}
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
