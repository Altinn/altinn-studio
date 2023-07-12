import React, { useEffect } from 'react';
import { ExpressionPropertyBase } from '../../../types/Expressions';
import { Button, ButtonColor, ButtonVariant, Select } from '@digdir/design-system-react';
import { XMarkIcon, PencilIcon } from '@navikt/aksel-icons';
import { ExpressionContent, ExpressionElement } from './ExpressionContent';
import { Dynamic } from '../../rightMenu/DynamicsTab';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { v4 as uuidv4 } from 'uuid';

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

  const allowToSpecifyExpression = Object.values(properties.expressionProperties).includes(selectedAction);
  const propertiesList = dynamic.expressionElements.length > 0 ? properties.expressionProperties : properties.availableProperties;

  const addActionToDynamic = (action: string) => {
    setSelectedAction(action);
    dynamic.property = action as ExpressionPropertyBase;
    const newExpressionElement: ExpressionElement = { id: uuidv4() };
    dynamic.expressionElements.push(newExpressionElement); // add id?
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

  console.log('dynamic', dynamic);
  return (
    <>
      {dynamic.editMode ? (
        <div>
          {showRemoveDynamicButton &&
            <Button
              color={ButtonColor.Secondary}
              icon={<XMarkIcon/>}
              onClick={() => onRemoveDynamic(dynamic)} // delete dynamic - should also set expression element state back to default
              variant={ButtonVariant.Filled}
            />
          }
          <span>Velg hva som skal skje med {component.id}</span>
          <Select
            onChange={(action) => addActionToDynamic(action)}
            options={propertiesList.map((property: string) => ({
              label: property,
              value: property
            }))}
            value={dynamic.property}
          />
          {expressionElements.map((expEl: ExpressionElement) => (
            <li key={expEl.id}>
              <ExpressionContent // context?
                expressionAction={allowToSpecifyExpression}
                expressionElement={expEl}
                onAddExpressionElement={addExpressionElement}
                onUpdateExpressionElement={updateExpressionElement}
                onRemoveExpressionElement={() => removeExpressionElement(expEl)}
              />
            </li>
          ))}
        </div>) : (
        <>
          <Button
            color={ButtonColor.Secondary}
            icon={<XMarkIcon />}
            onClick={() => onRemoveDynamic(dynamic)}
            variant={ButtonVariant.Filled}
          />
          <Button
            icon={<PencilIcon />}
            onClick={() => onEditDynamic(dynamic)}
            variant={ButtonVariant.Outline}
          />
          <span>{dynamic.property} {component.id} hvis</span>
          {expressionElements.map((expEl: ExpressionElement) => (
            <li key={expEl.id}>
              <span>{expEl.dataSource} {expEl.value}</span>
              <span>{expEl.function}</span>
              <span>{expEl.comparableDataSource} {expEl.comparableValue}</span>
            </li> // add a green checkmark
          ))}
        </>
      )
      }
    </>
  );
}
