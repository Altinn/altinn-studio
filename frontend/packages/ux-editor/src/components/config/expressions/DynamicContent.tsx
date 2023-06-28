import React, {useEffect} from 'react';
import {ExpressionPropertyBase, ExpressionPropertyForGroup} from '../../../types/Expressions';
import {Button, ButtonColor, ButtonVariant, Select} from '@digdir/design-system-react';
import {XMarkIcon, PencilIcon} from '@navikt/aksel-icons';
import {ExpressionContent, ExpressionElement} from './ExpressionContent';
import {Dynamic} from "../../rightMenu/DynamicsTab";
import {FormComponent} from "../../../types/FormComponent";
import {FormContainer} from "../../../types/FormContainer";
import {LayoutItemType} from "../../../types/global";

interface ExpressionProps {
  component: FormComponent | FormContainer;
  dynamic: Dynamic;
  setShowAddDynamicButton: (value: any) => void;
  showRemoveDynamicButton: boolean;
  onRemoveDynamic: (dynamic: Dynamic) => void;
  onEditDynamic: (dynamic: Dynamic) => void;
}

export const DynamicContent = ({component, dynamic, setShowAddDynamicButton, showRemoveDynamicButton, onRemoveDynamic, onEditDynamic}: ExpressionProps) => {
  const [selectedAction, setSelectedAction] = React.useState<string>('Velg handling');
  const [expressionElements, setExpressionElements] = React.useState<ExpressionElement[]>([...dynamic.expressionElements] || []); // default state should be already existing expressions

  //const currentExpressionElements: ExpressionElement[] = dynamic.expressionElements.length && dynamic.expressionElements;
  // adapt list of actions if component is group
  // need an interface for the expression
  // need an intermediate object that represents the expression
  // Add a useState to see if specific expression is in viewMode or editMode - viewMode only possible if expression is fully configured

  const expressionProperties = component.itemType === LayoutItemType.Container ?
    (Object.values(ExpressionPropertyBase) as string[])
      .concat(Object.values(ExpressionPropertyForGroup) as string[]) : Object.values(ExpressionPropertyBase);

  const allowToSpecifyExpression = Object.values(expressionProperties).includes(selectedAction);

  const addActionToDynamic = (action: string) => {
    setSelectedAction(action);
    dynamic.property = action as ExpressionPropertyBase;
    dynamic.expressionElements.push({} as ExpressionElement); // add id?
    setExpressionElements(dynamic.expressionElements);
  };

  const addExpressionElement = () => {
    const updatedExpressionElements = [...dynamic.expressionElements, {} as ExpressionElement];
    dynamic.expressionElements.push({} as ExpressionElement);
    setExpressionElements(updatedExpressionElements);
  };

  const updateExpressionElement = () => {
    const updatedExpressionElements = [...dynamic.expressionElements];
    setExpressionElements(updatedExpressionElements);
  };

  const removeExpressionElement = (expressionElement: ExpressionElement) => {
    if (dynamic.expressionElements.length < 2){
      dynamic.expressionElements = [{} as ExpressionElement];
      setExpressionElements([{} as ExpressionElement]);
    }
    else {
      const updatedExpressionElements = dynamic.expressionElements.filter((expEl: ExpressionElement) => expEl !== expressionElement);
      const lastExpressionElement = updatedExpressionElements[updatedExpressionElements.length - 1];
      dynamic.expressionElements = [...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), {...lastExpressionElement,  expressionOperatorForPrevExpression: null}];
      setExpressionElements([...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), {...lastExpressionElement,  expressionOperatorForPrevExpression: null}]);
    }
  };

  useEffect(() => {
    if (dynamic.expressionElements.length > 0 && Object.keys(dynamic.expressionElements[dynamic.expressionElements.length - 1]).length > 4) {
      setShowAddDynamicButton(true);
    }
  }, [dynamic, expressionElements]);

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
            options={expressionProperties.map((property: string) => ({
              label: property,
              value: property
            }))} // Reduce this list based on existing dynamics on the component; hidden, required, readOnly...
            value={selectedAction}
          />
          {expressionElements.map((expEl: ExpressionElement) => (
            <ExpressionContent // context?
              expressionAction={allowToSpecifyExpression}
              expressionElement={expEl}
              onAddExpressionElement={addExpressionElement}
              onUpdateExpressionElement={updateExpressionElement}
              onRemoveExpressionElement={() => removeExpressionElement(expEl)}
            />
          ))}
        </div>) : (
        <>
          <Button
            color={ButtonColor.Secondary}
            icon={<XMarkIcon />}
            onClick={() => onRemoveDynamic(dynamic)} // delete dynamic
            variant={ButtonVariant.Filled}
          />
          <Button
            icon={<PencilIcon />}
            onClick={() => onEditDynamic(dynamic)} // edit dynamic
            variant={ButtonVariant.Outline}
          />
          <span>{selectedAction} {component.id} hvis</span>
          {expressionElements.map((expEl: ExpressionElement) => (
            <div>
              <span>{expEl.dataSource} {expEl.value}</span>
              <span>{expEl.function}</span>
              <span>{expEl.comparableDataSource} {expEl.comparableValue}</span>
            </div> // add a green checkmark
          ))}
        </>
      )
      }
    </>
  );
}
