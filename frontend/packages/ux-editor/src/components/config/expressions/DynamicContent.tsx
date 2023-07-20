import React, { useEffect, useRef } from 'react';
import {
  expressionFunctionTexts,
  expressionInPreviewPropertyTexts,
  ExpressionPropertyBase,
  expressionPropertyTexts
} from '../../../types/Expressions';
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
  onGetProperties: (dynamic: Dynamic) => {availableProperties: string[], expressionProperties: string[]}; // actions?
  showRemoveDynamicButton: boolean;
  onAddDynamic: () => void;
  onRemoveDynamic: (dynamic: Dynamic) => void;
  onEditDynamic: (dynamic: Dynamic) => void;
}

export const DynamicContent = ({ component, dynamic, onGetProperties, onAddDynamic, showRemoveDynamicButton, onRemoveDynamic, onEditDynamic }: ExpressionProps) => {
  const [selectedAction, setSelectedAction] = React.useState<string>(dynamic.property || 'default');
  const [expressionElements, setExpressionElements] = React.useState<ExpressionElement[]>([...dynamic.expressionElements]); // default state should be already existing expressions
  const { t } = useTranslation();
  const dynamicInEditStateRef = useRef(null);
  const dynamicInPreviewStateRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Need to check for dropdown explicit because it is rendered in a portal outside the component
      const isDropDown = event.target.tagName === 'BUTTON' && event.target.getAttribute('role') === 'option';
      // Check for buttons since clicks outside the dynamic on other buttons should not trigger add dynamic
      const isButton = event.target.tagName === 'BUTTON' || event.target.tagName === 'path' || event.target.tagName === 'svg';
      const clickTargetIsNotInDynamic = (dynamicInEditStateRef.current && !(dynamicInEditStateRef.current as HTMLElement).contains(event.target) && !isDropDown);
      if (clickTargetIsNotInDynamic && !isButton && dynamic.editMode) {
        // Click occurred outside the dynamic in edit mode
        //onAddDynamic();  // TODO: enable this after testing
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    }
  }, [dynamicInEditStateRef.current]);

  const allowToSpecifyExpression = Object.values(onGetProperties(dynamic).expressionProperties).includes(selectedAction);
  const propertiesList = onGetProperties(dynamic).availableProperties;

  const addActionToDynamic = (action: string) => {
    if (action === 'default') {
      return;
    }
    setSelectedAction(action);
    dynamic.property = action as ExpressionPropertyBase;
    if (dynamic.expressionElements.length > 0) {
      return;
    }
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

  console.log('dynamic', dynamic); // TODO: Remove when fully tested
  return (
    <>
      {dynamic.editMode ? (
        <div className={showRemoveDynamicButton ? classes.dynamicInEdit : null} ref={dynamicInEditStateRef}>
          {showRemoveDynamicButton &&
            <Button
              className={classes.removeDynamicButton}
              color={ButtonColor.Danger}
              icon={<XMarkIcon/>}
              onClick={() => onRemoveDynamic(dynamic)} // delete dynamic - should also set expression element state back to default
              variant={ButtonVariant.Quiet}
            />
          }
          <p>
            <Trans i18nKey={'right_menu.dynamics_action_on_component'} values={{ componentName: component.id }} components={{ bold: <strong/> }}/>
          </p>
          <Select
            onChange={(action) => addActionToDynamic(action)}
            options={[{ label: 'Velg handling...', value: 'default' }].concat(propertiesList.map((property: string) => ({
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
        <div className={classes.dynamicInPreview} ref={dynamicInPreviewStateRef}>
          <div className={classes.dynamicDetails}>
            <span><Trans i18nKey={expressionInPreviewPropertyTexts(t)[dynamic.property]} values={{ componentName: component.id }} components={{ bold: <strong/> }}/></span>
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
