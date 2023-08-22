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
import { convertDynamicToExternalFormat, convertExternalDynamicToInternal } from '../../utils/dynamicsUtils';
import { LayoutItemType } from '../../types/global';
import classes from './RightMenu.module.css';
import { v4 as uuidv4 } from 'uuid';
import { Divider } from 'app-shared/primitives';
import { FormComponent } from '../../types/FormComponent';
import { useUpdateFormComponentMutation } from '../../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

type DynamicsProps = {
  onShowNewDynamics: (value: boolean) => void;
  showNewDynamics: boolean;
};

// TODO: Consider calling this concept something less abstract - operation? Issue: #10858
export const Dynamics = ({ onShowNewDynamics, showNewDynamics }: DynamicsProps) => {
  const { formId, form } = useContext(FormContext);
  const { org, app } = useParams();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSetName);
  const [dynamics, setDynamics] = React.useState<Dynamic[]>([]);
  const t = useText();

  // adapt list of actions if component is group
  const expressionProperties = form && (form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase));

  useEffect(() => {
    if (form) {
      const propertiesWithDynamics: (ExpressionPropertyBase | ExpressionPropertyForGroup)[] | undefined = expressionProperties && Object.keys(form).filter(property => expressionProperties.includes(property)).map(property => property as ExpressionPropertyBase | ExpressionPropertyForGroup);
      const potentialConvertedExternalDynamics: Dynamic[] = propertiesWithDynamics?.filter(property => typeof form[property] !== 'boolean')?.map(property => convertExternalDynamicToInternal(property, form[property]));
      const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
      const defaultDynamics = potentialConvertedExternalDynamics?.length === 0 ? [defaultDynamic] : potentialConvertedExternalDynamics;
      setDynamics(defaultDynamics);
    }
  }, [form])

  const showRemoveDynamicButton = dynamics?.length > 1;
  const successfullyAddedDynamicIdRef = useRef('default');

  if (!formId || !form) return t('right_menu.content_empty');

  const addDynamic = async () => {
    // TODO: Consider have a state for dynamicIdInEditMode instead of iterating over all every time to adapt the editMode prop
    const nonEditableDynamics: Dynamic[] = await Promise.all([...dynamics.filter(prevDynamic => (prevDynamic.expressionElements && prevDynamic.expressionElements.length > 0) || prevDynamic.complexExpression)].map(async prevDynamic => {
      if (prevDynamic.property && prevDynamic.editMode) {
        // TODO: What if dynamic is invalid format? Have some way to validate with app-frontend dev-tools. Issue #10859
        form[prevDynamic.property] = convertDynamicToExternalFormat(prevDynamic);
        try {
          await updateFormComponent({ updatedComponent: form as FormComponent, id: formId });
          successfullyAddedDynamicIdRef.current = prevDynamic.id;
        } catch (error) {
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
    if (dynamic.property) {
      // TODO: What if the property was set to true or false before? Issue #10860
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
          icon={<PlusIcon/>}
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
      {shouldDisplayFeature('expressions') &&
        (<div className={classes.dynamicsVersionCheckBox}>
          <Divider/>
          <LegacyCheckbox
            label={t('right_menu.show_new_dynamics')}
            name={'checkbox-name'}
            checked={showNewDynamics}
            onChange={() => onShowNewDynamics(!showNewDynamics)}
          />
        </div>)
      }
    </div>
  )
};
