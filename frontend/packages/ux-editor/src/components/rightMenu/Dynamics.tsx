import React, { useContext, useEffect } from 'react';
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
import { DynamicContent } from '../config/expressions/DynamicContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../hooks';
import { FormContext } from '../../containers/FormContext';
import {
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Dynamic,
  DataSource,
  ExpressionElement, ExpressionFunction
} from '../../types/Expressions';
import { LayoutItemType } from '../../types/global';
import classes from './RightMenu.module.css';
import { v4 as uuidv4 } from 'uuid';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { Divider } from 'app-shared/primitives';
import { FormComponent } from "../../types/FormComponent";

type DynamicsTabProps = {
  onShowNewDynamicsTab: (value: boolean) => void;
  showNewDynamicsTab: boolean;
};

export const DynamicsTab = ({ onShowNewDynamicsTab, showNewDynamicsTab }: DynamicsTabProps) => {
  const { formId, form, handleUpdate, handleComponentSave } = useContext(FormContext);
  const t = useText();

  if (!formId || !form) return t('right_menu.content_empty');

  // adapt list of actions if component is group
  const expressionProperties = form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase);
  const propertiesWithDynamics: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] = Object.keys(form).filter(property => expressionProperties.includes(property)).map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);
  const potentialConvertedExternalDynamics: Dynamic[] = propertiesWithDynamics.filter(property => typeof form[property] !== 'boolean').map(property => convertExternalDynamicToInternal(property, form[property]));
  const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
  const [dynamics, setDynamics] = React.useState<Dynamic[]>(potentialConvertedExternalDynamics || [defaultDynamic]); // default state should be already existing dynamics
  const [showRemoveDynamicButton, setShowRemoveDynamicButton] = React.useState<boolean>(false);

  useEffect(() => {
    if (dynamics && dynamics.length < 2) {
      setShowRemoveDynamicButton(false);
    } else {
      setShowRemoveDynamicButton(true);
    }
  }, [dynamics]);

  const convertDynamicToExternalFormat = (dynamic: Dynamic): any => {
    if (dynamic.complexExpression) {
      return dynamic.complexExpression;
    }
    const expressions: any[] = dynamic.expressionElements.map(expression => {
      const expressionObject = [];
      expressionObject[0] = expression.function;
      if (expression.dataSource === DataSource.ApplicationSettings ||
        expression.dataSource === DataSource.Component ||
        expression.dataSource === DataSource.DataModel ||
        expression.dataSource === DataSource.InstanceContext) {
        expressionObject[1] = [expression.dataSource, expression.value];
      }
      else {
        expressionObject[1] = expression.value;
      }
      if (expression.comparableDataSource === DataSource.ApplicationSettings ||
        expression.comparableDataSource === DataSource.Component ||
        expression.comparableDataSource === DataSource.DataModel ||
        expression.comparableDataSource === DataSource.InstanceContext) {
        expressionObject[2] = [expression.comparableDataSource, expression.comparableValue];
      }
      else {
        expressionObject[2] = expression.comparableValue;
      }
      return expressionObject;
    });
    return dynamic.operator ? [dynamic.operator, expressions] : expressions;
  };

  function convertExternalDynamicToInternal(booleanValue: string, dynamic: any): Dynamic {

    const validOperatorOrFunction = (operatorOrFunction: string): boolean => {
      return (operatorOrFunction === 'or' || operatorOrFunction === 'and' || Object.values(ExpressionFunction).includes(operatorOrFunction as ExpressionFunction));
    }

    const hasMoreExpressions: boolean = (dynamic[0] === 'or' || dynamic[0] === 'and');
    const convertedDynamic: Dynamic = {
      id: uuidv4(),
      editMode: false,
      property: booleanValue as ExpressionPropertyBase | ExpressionPropertyForGroup,
      expressionElements: [],
    };

    if (!validOperatorOrFunction(dynamic[0])) {
      delete convertedDynamic.expressionElements;
      convertedDynamic.complexExpression = dynamic;
      return convertedDynamic;
    }

    if (!hasMoreExpressions) {
      const exp: ExpressionElement = {
        id: uuidv4(),
        function: dynamic[0] as ExpressionFunction, // might need an error handling if function is invalid
      }
      const updatedExpAddingValue = convertExpressionElement(exp, dynamic[1], false);
      convertedDynamic.expressionElements.push(convertExpressionElement(updatedExpAddingValue, dynamic[2], true));
      return convertedDynamic;
    }

    else {
      if (!validOperatorOrFunction(dynamic[0])) {
        delete convertedDynamic.expressionElements;
        convertedDynamic.complexExpression = dynamic;
        return convertedDynamic;
      }
      convertedDynamic.operator = dynamic[0];
      dynamic.slice(1).map(expEl => {
          const exp: ExpressionElement = {
            id: uuidv4(),
            function: expEl[0] as ExpressionFunction, // might need an error handling if function is invalid
          }
          const updatedExpAddingValue = convertExpressionElement(exp, expEl[1], false);
          convertedDynamic.expressionElements.push(convertExpressionElement(updatedExpAddingValue, expEl[2], true));
        }
      );
      return convertedDynamic;
    }
  }

  // adapt list of actions if component is group
  const expressionProperties =
    form.itemType === LayoutItemType.Container
      ? (Object.values(ExpressionPropertyBase) as string[]).concat(
          Object.values(ExpressionPropertyForGroup) as string[]
        )
      : Object.values(ExpressionPropertyBase);

  function convertExpressionElement(internalExpEl: ExpressionElement, externalExpEl: any, isComparable: boolean): ExpressionElement {
    if (Array.isArray(externalExpEl)) {
      isComparable ?  internalExpEl.comparableDataSource = externalExpEl[0] as DataSource : internalExpEl.dataSource = externalExpEl[0] as DataSource;
      isComparable ? internalExpEl.comparableValue = externalExpEl[1] : internalExpEl.value = externalExpEl[1];
    }
    else {
      isComparable ? internalExpEl.comparableDataSource = (typeof externalExpEl as DataSource) : internalExpEl.dataSource = (typeof externalExpEl as DataSource) // to string. Can be string, number, boolean or null
      isComparable ? internalExpEl.comparableValue = externalExpEl : internalExpEl.value = externalExpEl;
    }
    return internalExpEl;
  }

  const addDynamic = async () => {
    // TODO: Convert dynamics object to correct format and save dynamic to layout with api call
    const dynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
    const nonEditableDynamics: Dynamic[] = await Promise.all([...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(async prevDynamic => {
      debugger;
      if (prevDynamic.property && prevDynamic.editMode) form[prevDynamic.property] = convertDynamicToExternalFormat(prevDynamic);
      handleUpdate(form);
      await handleComponentSave(formId, form as FormComponent);
      debugger;
      return ({ ...prevDynamic, editMode: false })
    }));
    setDynamics(dynamics.length < expressionProperties.length ? nonEditableDynamics.concat(dynamic) : nonEditableDynamics);

  };

  const editDynamic = (dynamic: Dynamic) => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    const updatedDynamics = [...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(prevDynamic => {
      if (prevDynamic === dynamic) return { ...prevDynamic, editMode: true }
    else return { ...prevDynamic, editMode: false } });

    setDynamics([...updatedDynamics]);
  };

  const removeDynamic = (dynamic: Dynamic) => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    if (dynamics.length === 1) {
      setDynamics((prevDynamics) =>
        prevDynamics.filter((prevDynamic) => prevDynamic !== dynamic).concat(defaultDynamic)
      );
    } else {
      setDynamics((prevDynamics) => prevDynamics.filter((prevDynamic) => prevDynamic !== dynamic));
    }
  };

  const getProperties = (dynamic: Dynamic) => {
    const alreadyUsedProperties = dynamics.map((prevDynamic) => {
      if (dynamic !== prevDynamic) return prevDynamic.property;
    }) as string[];
    const availableProperties = expressionProperties.filter(
      (expressionProperty) => !Object.values(alreadyUsedProperties).includes(expressionProperty)
    );
    return { availableProperties, expressionProperties };
  };

  return (
    <div className={classes.dynamics}>
      {Object.values(dynamics).map((dynamic: Dynamic) => (
        <div key={dynamic.id}>
          <DynamicContent
            component={form}
            dynamic={dynamic}
            onGetProperties={() => getProperties(dynamic)}
            showRemoveDynamicButton={showRemoveDynamicButton}
            onAddDynamic={addDynamic}
            onRemoveDynamic={() => removeDynamic(dynamic)}
            onEditDynamic={() => editDynamic(dynamic)}
          />
        </div>
      ))}
      {dynamics.length < expressionProperties.length ? (
        <Button
          aria-label={t('right_menu.dynamics_add')}
          color='primary'
          fullWidth
          icon={<PlusIcon />}
          id='right_menu.dynamics_add'
          onClick={addDynamic}
          size='small'
          variant='outline'
        >
          {t('right_menu.dynamics_add')}
        </Button>
      ) : (
        <Alert className={classes.dynamicsAlert}>
          {t('right_menu.dynamics_dynamics_limit_reached_alert')}
        </Alert>
      )}
      <div className={classes.dynamicsVersionCheckBox}>
        <Divider />
        {!_useIsProdHack() && (
          <LegacyCheckbox
            label={t('right_menu.show_new_dynamics')}
            name={'checkbox-name'}
            checked={showNewDynamics}
            onChange={() => onShowNewDynamics(!showNewDynamics)}
          />
        )}
      </div>
    </div>
  );
};
