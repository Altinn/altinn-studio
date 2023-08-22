import React, { useContext, useEffect } from 'react';
import { Alert, Button, LegacyCheckbox } from '@digdir/design-system-react';
import { DynamicContent } from '../config/expressions/DynamicContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../hooks';
import { FormContext } from '../../containers/FormContext';
import { ExpressionElement } from '../config/expressions/ExpressionContent';
import { ExpressionPropertyBase, ExpressionPropertyForGroup } from '../../types/Expressions';
import { LayoutItemType } from '../../types/global';
import classes from './RightMenu.module.css';
import { v4 as uuidv4 } from 'uuid';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { Divider } from 'app-shared/primitives';

export interface Dynamic {
  id?: string;
  editMode: boolean;
  property?: ExpressionPropertyBase | ExpressionPropertyForGroup; // action?
  expressionElements?: ExpressionElement[];
}

type DynamicsProps = {
  onShowNewDynamics: (value: boolean) => void;
  showNewDynamics: boolean;
};

export const Dynamics = ({ onShowNewDynamics, showNewDynamics }: DynamicsProps) => {
  const { form, formId } = useContext(FormContext);

  const defaultDynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
  const [dynamics, setDynamics] = React.useState<Dynamic[]>([defaultDynamic]); // default state should be already existing dynamics
  const [showRemoveDynamicButton, setShowRemoveDynamicButton] = React.useState<boolean>(false);
  const t = useText();

  useEffect(() => {
    if (dynamics && dynamics.length < 2) {
      setShowRemoveDynamicButton(false);
    } else {
      setShowRemoveDynamicButton(true);
    }
  }, [dynamics]);

  if (!formId || !form) return t('right_menu.content_empty');

  // adapt list of actions if component is group
  const expressionProperties =
    form.itemType === LayoutItemType.Container
      ? (Object.values(ExpressionPropertyBase) as string[]).concat(
          Object.values(ExpressionPropertyForGroup) as string[]
        )
      : Object.values(ExpressionPropertyBase);

  const addDynamic = () => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    const dynamic: Dynamic = { id: uuidv4(), editMode: true, expressionElements: [] };
    const nonEditableDynamics: Dynamic[] = [
      ...dynamics.filter((prevDynamic) => prevDynamic.expressionElements.length > 0),
    ].map((prevDynamic) => ({ ...prevDynamic, editMode: false }));
    setDynamics(
      dynamics.length < expressionProperties.length
        ? nonEditableDynamics.concat(dynamic)
        : nonEditableDynamics
    );
  };

  const editDynamic = (dynamic: Dynamic) => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    const updatedDynamics = [
      ...dynamics.filter((prevDynamic) => prevDynamic.expressionElements.length > 0),
    ].map((prevDynamic) => {
      if (prevDynamic === dynamic) return { ...prevDynamic, editMode: true };
      else return { ...prevDynamic, editMode: false };
    });

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

  // Need to collect all existing expressions and list them here - or send a state prop to all the mapped expressions
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
