import React, { useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
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
  const t = useText();

  useEffect(() => {
    if (form) {
      // adapt list of actions if component is group
      const propertiesWithDynamics: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] | undefined = expressionProperties && Object.keys(form).filter(property => expressionProperties.includes(property)).map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);
      const potentialConvertedExternalDynamics: Dynamic[] = propertiesWithDynamics?.filter(property => typeof form[property] !== 'boolean')?.map(property => convertExternalDynamicToInternal(property, form[property]));
      const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
      const defaultDynamics = potentialConvertedExternalDynamics?.length === 0 ? [defaultDynamic] : potentialConvertedExternalDynamics;
      setDynamics(defaultDynamics);
    }
  }, [form])

  if (!formId || !form) return t('right_menu.content_empty');

  // adapt list of actions if component is group
  const expressionProperties = form && (form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase));

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

  const showRemoveDynamicButton = dynamics?.length > 1;
  const successfullyAddedDynamicIdRef = useRef('default');

  const addDynamic = async () => {
    // TODO: Consider have a state for dynamicIdInEditMode instead of iterating over all every time to adapt the editMode prop
    const nonEditableDynamics: Dynamic[] = await Promise.all([...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(async prevDynamic => {
      if (prevDynamic.property && prevDynamic.editMode) {
        // TODO: What if dynamic is invalid format? Have some way to validate with app-frontend dev-tools
        form[prevDynamic.property] = convertDynamicToExternalFormat(prevDynamic);
        try {
        await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
          successfullyAddedDynamicIdRef.current = prevDynamic.id;
        }
        catch (error) {
          successfullyAddedDynamicIdRef.current = 'default';
        }
      }
      return ({ ...prevDynamic, editMode: false })
    }));
    const dynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
    const newDynamics = dynamics.length < expressionProperties.length ? nonEditableDynamics.concat(dynamic) : nonEditableDynamics;
    setDynamics(newDynamics);
  };

  const updateDynamic = (index: number, newDynamic: Dynamic) => {
    const updatedDynamics = [...dynamics];
    updatedDynamics[index] = newDynamic;
    setDynamics(updatedDynamics);
  }

  const editDynamic = (dynamic: Dynamic) => {
    // TODO: Consider have a state for dynamicIdInEditMode instead of iterating over all every time to adapt the editMode prop
    // Set editMode fields for all prev dynamics to false
    const updatedDynamics = [...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(prevDynamic => {
      if (prevDynamic === dynamic) return { ...prevDynamic, editMode: true }
      else return { ...prevDynamic, editMode: false }
    });
    setDynamics(updatedDynamics);
  };

  const removeDynamic = async (dynamic: Dynamic) => {
    if (dynamic.property)
    {
      // TODO: What if the property was set to true or false before?
      delete form[dynamic.property];
      await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
    }
    const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
    const newDynamics = dynamics.length === 1 ? dynamics.filter(prevDynamic => prevDynamic !== dynamic).concat(defaultDynamic) : dynamics.filter(prevDynamic => prevDynamic !== dynamic);
    setDynamics(newDynamics)
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
      {Object.values(dynamics).map((dynamic: Dynamic, index: number) => (
        <div key={dynamic.id}>
          <DynamicContent
            component={form}
            dynamic={dynamic}
            onGetProperties={() => getProperties(dynamic)}
            showRemoveDynamicButton={showRemoveDynamicButton}
            onAddDynamic={addDynamic}
            successfullyAddedDynamicId={successfullyAddedDynamicIdRef.current}
            onUpdateDynamic={newDynamic => updateDynamic(index, newDynamic)}
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
        {
          <LegacyCheckbox
            label={t('right_menu.show_new_dynamics')}
            name={'checkbox-name'}
            checked={showNewDynamics}
            onChange={() => onShowNewDynamics(!showNewDynamics)}
          />
        }
      </div>
    </div>
  );
};
