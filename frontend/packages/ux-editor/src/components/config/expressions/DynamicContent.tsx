import React, { useEffect } from 'react';
import {expressionFunctionTexts, ExpressionPropertyBase, expressionPropertyTexts} from '../../../types/Expressions';
import { Button, ButtonColor, ButtonVariant, Select } from '@digdir/design-system-react';
import { XMarkIcon, PencilIcon, ArrowRightIcon } from '@navikt/aksel-icons';
import { ExpressionContent, ExpressionElement } from './ExpressionContent';
import { Dynamic } from '../../rightMenu/DynamicsTab';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { v4 as uuidv4 } from 'uuid';
import { Trans, useTranslation } from 'react-i18next';
import classes from './DynamicContent.module.css';

interface ExpressionProps {
  component: FormComponent | FormContainer;
  dynamic: Dynamic;
  properties: {availableProperties: string[], expressionProperties: string[]}; // actions?
  setShowAddDynamicButton: (value: any) => void;
  showRemoveDynamicButton: boolean;
  onRemoveDynamic: (dynamic: Dynamic) => void;
  onEditDynamic: (dynamic: Dynamic) => void;
}

export const DynamicContent = ({ component, dynamic, properties, setShowAddDynamicButton, showRemoveDynamicButton, onRemoveDynamic, onEditDynamic }: ExpressionProps) => {
  const [selectedAction, setSelectedAction] = React.useState<string>(dynamic.property || 'Velg handling');
  const [expressionElements, setExpressionElements] = React.useState<ExpressionElement[]>([...dynamic.expressionElements]); // default state should be already existing expressions
  const { t } = useTranslation();

  const allowToSpecifyExpression = Object.values(properties.expressionProperties).includes(selectedAction);
  const propertiesList = dynamic.expressionElements.length > 0 ? properties.expressionProperties : properties.availableProperties;

  const addActionToDynamic = (action: string) => {
    setSelectedAction(action);
    dynamic.property = action as ExpressionPropertyBase;
    const newExpressionElement: ExpressionElement = { id: uuidv4() };
    dynamic.expressionElements.push(newExpressionElement); // TODO: add id and check if dynamic is already in list and change property value if so
    setExpressionElements(dynamic.expressionElements);
  };

  const addExpressionElement = () => {
    const newExpressionElement: ExpressionElement = { id: uuidv4() };
    const updatedExpressionElements = [...dynamic.expressionElements, newExpressionElement];
    dynamic.expressionElements.push(newExpressionElement);
    setExpressionElements(updatedExpressionElements);
  };

  const updateExpressionElement = () => {
    const updatedExpressionElements = [...dynamic.expressionElements];
    setExpressionElements(updatedExpressionElements);
  };

  const removeExpressionElement = (expressionElement: ExpressionElement) => {
    if (dynamic.expressionElements.length < 2){
      const newExpressionElement: ExpressionElement = { id: uuidv4() };
      dynamic.expressionElements = [newExpressionElement];
      setExpressionElements([newExpressionElement]);
    }
    else {
      const updatedExpressionElements = dynamic.expressionElements.filter((expEl: ExpressionElement) => expEl !== expressionElement);
      const lastExpressionElement = updatedExpressionElements[updatedExpressionElements.length - 1];
      dynamic.expressionElements = [...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), { ...lastExpressionElement,  expressionOperatorForNextExpression: undefined }];
      setExpressionElements([...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), { ...lastExpressionElement,  expressionOperatorForNextExpression: undefined }]);
    }
  };

  useEffect(() => {
    if (dynamic.expressionElements.length > 0 && !Object.values(dynamic.expressionElements).find(expEl => Object.keys(expEl).length < 6)) {
      setShowAddDynamicButton(true);
    }
    else {
      setShowAddDynamicButton(false);
    }
  }, [dynamic, expressionElements, setShowAddDynamicButton]);

  console.log('dynamic', dynamic); // TODO: Remove when fully tested
  return (
    <>
      {dynamic.editMode ? (
        <div>
          {showRemoveDynamicButton &&
            <Button
              color={ButtonColor.Danger}
              icon={<XMarkIcon/>}
              onClick={() => onRemoveDynamic(dynamic)} // delete dynamic - should also set expression element state back to default
              variant={ButtonVariant.Quiet}
            />
          }
          <p>
            <Trans i18nKey={'right_menu.dynamics_action_on_component'} values={{componentName: component.id}} components={{bold: <strong/>}}/>
          </p>
          <Select
            onChange={(action) => addActionToDynamic(action)}
            options={[{label: 'Velg handling...', value: 'default'}].concat(propertiesList.map((property: string) => ({
              label: expressionPropertyTexts(t)[property],
              value: property
            })))}
            value={dynamic.property || 'default'}
          />
          {expressionElements.map((expEl: ExpressionElement) => (
            <div key={expEl.id}>
              <ExpressionContent // context?
                expressionAction={allowToSpecifyExpression}
                expressionElement={expEl}
                onAddExpressionElement={addExpressionElement}
                onUpdateExpressionElement={updateExpressionElement}
                onRemoveExpressionElement={() => removeExpressionElement(expEl)}
              />
            </div>
          ))}
        </div>) : (
        <div className={classes.dynamicInPreview}>
          <div className={classes.dynamicDetails}>
          <span>{expressionPropertyTexts(t)[dynamic.property]} <span>{component.id}</span> hvis</span>
              {expressionElements.map((expEl: ExpressionElement) => (
                <div key={expEl.id}>
                  <p> <ArrowRightIcon fontSize='1.5rem'/>{expEl.dataSource} {' '} <span>{expEl.value}</span></p>
                  <p className={classes.bold}>{expressionFunctionTexts(t)[expEl.function]}</p>
                  <p> <ArrowRightIcon fontSize='1.5rem'/>{expEl.comparableDataSource} {' '} <span>{expEl.comparableValue}</span></p>
                  <p className={classes.bold}>{expEl.expressionOperatorForNextExpression}</p>
                </div> // add a green checkmark
              ))}
          </div>
          <div>
            <Button
              color={ButtonColor.Danger}
              icon={<XMarkIcon />}
              onClick={() => onRemoveDynamic(dynamic)}
              variant={ButtonVariant.Quiet}
            />
            <Button
              icon={<PencilIcon />}
              onClick={() => onEditDynamic(dynamic)}
              variant={ButtonVariant.Quiet}
            />
          </div>
        </div>
      )
      }
    </>
  );
}
