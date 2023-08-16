import React, { useContext, useEffect } from 'react';
<<<<<<< HEAD
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
=======
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Alert, Button, ButtonColor, ButtonSize, ButtonVariant, Checkbox } from '@digdir/design-system-react';
>>>>>>> 3cc7c9af7 (Make sure dynamics are updated when switching component)
import { DynamicContent } from '../config/expressions/DynamicContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../hooks';
import { FormContext } from '../../containers/FormContext';
import {
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Dynamic,
} from '../../types/Expressions';
import { convertDynamicToExternalFormat, convertExternalDynamicToInternal } from './DynamicsUtils';
import { LayoutItemType } from '../../types/global';
import classes from './RightMenu.module.css';
import { v4 as uuidv4 } from 'uuid';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { Divider } from 'app-shared/primitives';
import { FormComponent } from '../../types/FormComponent';
import { useUpdateFormComponentMutation } from '../../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';

type DynamicsProps = {
  onShowNewDynamics: (value: boolean) => void;
  showNewDynamics: boolean;
};

export const Dynamics = ({ onShowNewDynamics, showNewDynamics }: DynamicsProps) => {
  const { formId, form } = useContext(FormContext);
  const { org, app } = useParams();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSetName);
  const [dynamics, setDynamics] = React.useState<Dynamic[]>([]);
  const [showRemoveDynamicButton, setShowRemoveDynamicButton] = React.useState<boolean>(false);
  const [successfullyAddedDynamicId, setSuccessfullyAddedDynamicId] = React.useState<string>('default');
  const t = useText();

  useEffect(() => {
    if (dynamics?.length < 2) {
      setShowRemoveDynamicButton(false);
    } else {
      setShowRemoveDynamicButton(true);
    }
  }, [dynamics]);

  const expressionProperties = form && (form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase));

  useEffect(() => {
    if (form) {
      // adapt list of actions if component is group
      const propertiesWithDynamics: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] | undefined = expressionProperties && Object.keys(form).filter(property => expressionProperties.includes(property)).map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);
      const potentialConvertedExternalDynamics: Dynamic[] = propertiesWithDynamics?.filter(property => typeof form[property] !== 'boolean')?.map(property => convertExternalDynamicToInternal(property, form[property]));
      const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
      setDynamics(potentialConvertedExternalDynamics?.length === 0 ? [defaultDynamic] : potentialConvertedExternalDynamics)
    }
  }, [form])


  if (!formId || !form) return t('right_menu.content_empty');

<<<<<<< HEAD
  const convertDynamicToExternalFormat = (dynamic: Dynamic): any => {
    if (dynamic.complexExpression) {
      return dynamic.complexExpression;
    }
    const expressions: any[] = [];
    dynamic.expressionElements.map(expression => {
      const expressionObject = [];
      expressionObject[0] = expression.function;
      if (expression.dataSource === DataSource.ApplicationSettings ||
        expression.dataSource === DataSource.Component ||
        expression.dataSource === DataSource.DataModel ||
        expression.dataSource === DataSource.InstanceContext) {
        expressionObject[1] = [expression.dataSource, expression.value];
      } else {
        expressionObject[1] = expression.value;
      }
      if (expression.comparableDataSource === DataSource.ApplicationSettings ||
        expression.comparableDataSource === DataSource.Component ||
        expression.comparableDataSource === DataSource.DataModel ||
        expression.comparableDataSource === DataSource.InstanceContext) {
        expressionObject[2] = [expression.comparableDataSource, expression.comparableValue];
      } else {
        expressionObject[2] = expression.comparableValue;
      }
      expressions.push(expressionObject);
    });
    return dynamic.operator ? [dynamic.operator, expressions] : expressions[0];
  };

  function convertExternalDynamicToInternal(booleanValue: string, dynamic: any): Dynamic {

    const validOperatorOrFunction = (operatorOrFunction: string): boolean => {
      return (Object.values(Operator).includes(operatorOrFunction as Operator) || Object.values(ExpressionFunction).includes(operatorOrFunction as ExpressionFunction));
    }

    const hasMoreExpressions: boolean = Object.values(Operator).includes(dynamic[0] as Operator);
    const convertedDynamic: Dynamic = {
      id: uuidv4(),
      editMode: false,
      property: booleanValue as ExpressionPropertyBase | ExpressionPropertyForGroup,
      expressionElements: [],
    };

    // Fall back to complex expression if:
    // 1. Expression does not start with an operator or a function, or
    // 2. Expression does not starts with an operator, but has two elements
    // (Studio will only be able to visualize expressions that does not match any of the above conditions)
    if (!validOperatorOrFunction(dynamic[0]) || (!Object.values(Operator).includes(dynamic[0]) && dynamic.length === 2)) {
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
    } else {
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
      isComparable ? internalExpEl.comparableDataSource = externalExpEl[0] as DataSource : internalExpEl.dataSource = externalExpEl[0] as DataSource;
      isComparable ? internalExpEl.comparableValue = externalExpEl[1] : internalExpEl.value = externalExpEl[1];
    } else {
      isComparable ? internalExpEl.comparableDataSource = (typeof externalExpEl as DataSource) : internalExpEl.dataSource = (typeof externalExpEl as DataSource) // to string. Can be string, number, boolean or null
      isComparable ? internalExpEl.comparableValue = externalExpEl : internalExpEl.value = externalExpEl;
    }
    return internalExpEl;
  }

=======
>>>>>>> 3cc7c9af7 (Make sure dynamics are updated when switching component)
  const addDynamic = async () => {
    // TODO: Consider have a state for dynamicIdInEditMode instead of iterating over all every time to adapt the editMode prop
    const nonEditableDynamics: Dynamic[] = await Promise.all([...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(async prevDynamic => {
      if (prevDynamic.property && prevDynamic.editMode) {
        // TODO: What if dynamic is invalid format? Have some way to validate with app-frontend dev-tools
        form[prevDynamic.property] = convertDynamicToExternalFormat(prevDynamic);
        try {
        await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
        setSuccessfullyAddedDynamicId(prevDynamic.id);
        }
        catch (error) {
          setSuccessfullyAddedDynamicId('default');
        }
      }
      return ({ ...prevDynamic, editMode: false })
    }));
    const dynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
    setDynamics(dynamics.length < expressionProperties.length ? nonEditableDynamics.concat(dynamic) : nonEditableDynamics);

  };

  const editDynamic = (dynamic: Dynamic) => {
    // TODO: Consider have a state for dynamicIdInEditMode instead of iterating over all every time to adapt the editMode prop
    // Set editMode fields for all prev dynamics to false
    const updatedDynamics = [...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(prevDynamic => {
      if (prevDynamic === dynamic) return { ...prevDynamic, editMode: true }
      else return { ...prevDynamic, editMode: false }
    });
    setDynamics([...updatedDynamics]);
  };

  const removeDynamic = async (dynamic: Dynamic) => {
    // Set editMode fields for all prev dynamics to false
    if (dynamics.length === 1) {
      // TODO: Isolate object that is set in a function for better testing opportunities
      const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
      setDynamics(prevDynamics => prevDynamics.filter(prevDynamic => prevDynamic !== dynamic).concat(defaultDynamic));
    } else {
      setDynamics(prevDynamics => prevDynamics.filter(prevDynamic => prevDynamic !== dynamic));
    }
    if (dynamic.property)
    {
      // TODO: What if the property was set to true or false before?
      delete form[dynamic.property];
      await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
    }
  };

  const getProperties = (dynamic: Dynamic) => {
    const alreadyUsedProperties = dynamics.map(prevDynamic => {
      if (dynamic !== prevDynamic) return prevDynamic.property
    }) as string[];
    const availableProperties = expressionProperties.filter(expressionProperty => !Object.values(alreadyUsedProperties).includes(expressionProperty));
    return { availableProperties, expressionProperties }
  };

  console.log('dynamics: ', dynamics)
  return (
    <div className={classes.dynamics}>
      {Object.values(dynamics).map((dynamic: Dynamic) => (
        <div key={dynamic.id}>
          <DynamicContent
            component={form}
            dynamic={dynamic}
            onGetProperties={() => getProperties(dynamic)}
            showRemoveDynamicButton={showRemoveDynamicButton}
            onAddDynamic={() => addDynamic()}
            successfullyAddedDynamicId={successfullyAddedDynamicId}
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
