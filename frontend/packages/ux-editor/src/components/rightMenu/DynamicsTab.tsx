import React, { useContext, useEffect } from 'react';
import { Button, ButtonColor, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { DynamicContent } from '../config/expressions/DynamicContent';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../hooks';
import { FormContext } from '../../containers/FormContext';
import { ExpressionElement } from '../config/expressions/ExpressionContent';
import { ExpressionPropertyBase, ExpressionPropertyForGroup } from '../../types/Expressions';
import { LayoutItemType } from '../../types/global';

export interface Dynamic {
  id?: string;
  editMode: boolean;
  property?: ExpressionPropertyBase | ExpressionPropertyForGroup; // action?
  expressionElements?: ExpressionElement[];
}

export const DynamicsTab = () => {
  const { form, formId } = useContext(FormContext);

  const defaultDynamic: Dynamic = { editMode: true, expressionElements: [] };
  const [dynamics, setDynamics] = React.useState<Dynamic[]>([defaultDynamic]); // default state should be already existing dynamics
  const [showAddDynamicButton, setShowAddDynamicButton] = React.useState<boolean>(false);
  const [showRemoveDynamicButton, setShowRemoveDynamicButton] = React.useState<boolean>(false);
  const t = useText();

  useEffect(() => {
    // Check if there are existing dynamics - should it be less than 1?
    if (dynamics && dynamics.length < 2) {
      setShowAddDynamicButton(false);
      setShowRemoveDynamicButton(false);
    }
    else {
      setShowAddDynamicButton(true);
      setShowRemoveDynamicButton(true);
    }
  }, [dynamics]);

  if (!formId || !form) return null;

  // adapt list of actions if component is group
  const expressionProperties = form.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase);

  const addDynamic = () => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    const dynamic: Dynamic = { editMode: true, expressionElements: [] };
    setDynamics(prevDynamics => prevDynamics.map(prevDynamic => ({ ...prevDynamic, editMode: false })).concat(dynamic));
  };

  const editDynamic = (dynamic: Dynamic) => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    const updatedDynamics = dynamics.map(prevDynamic => {
      if (prevDynamic === dynamic) return { ...prevDynamic, editMode: true }
    else return { ...prevDynamic, editMode: false } });

    setDynamics([...updatedDynamics]);
  };

  const removeDynamic = (dynamic: Dynamic) => {
    // Convert dynamic object to correct format and save dynamic to layout with api call
    // Set editMode fields for all prev dynamics to false
    if (dynamics.length === 1) {
      setDynamics(prevDynamics => prevDynamics.filter(prevDynamic => prevDynamic !== dynamic).concat(defaultDynamic));
    }
    else {
      setDynamics(prevDynamics => prevDynamics.filter(prevDynamic => prevDynamic !== dynamic));
    }
  };

  const getProperties = () => {
    const alreadyUsedProperties = dynamics.map(dynamic => dynamic.property) as string[];
    const availableProperties = expressionProperties.filter(expressionProperty => !Object.values(alreadyUsedProperties).includes(expressionProperty));
    return { availableProperties, expressionProperties }
  };

  // Need to collect all existing expressions and list them here - or send a state prop to all the mapped expressions
  return (
    <div>
      {Object.values(dynamics).map((dynamic: Dynamic) => (
        <li key={dynamic.id}>
          <DynamicContent
            component={form}
            dynamic={dynamic}
            properties={getProperties()}
            setShowAddDynamicButton={setShowAddDynamicButton}
            showRemoveDynamicButton={showRemoveDynamicButton}
            onRemoveDynamic={() => removeDynamic(dynamic)}
            onEditDynamic={() => editDynamic(dynamic)}
          />
        </li>
      ))}
      {showAddDynamicButton &&
        <Button
          aria-label={t('right_menu.dynamics_add')}
          color={ButtonColor.Secondary}
          fullWidth
          icon={<PlusIcon/>}
          id='right_menu.dynamics_add'
          onClick={addDynamic}
          size={ButtonSize.Small}
          variant={ButtonVariant.Outline}
        >
          {t('right_menu.dynamics_add')}
        </Button>
      }
  </div>
  );
};
