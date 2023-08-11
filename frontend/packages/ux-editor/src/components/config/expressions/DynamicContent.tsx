import React, {useEffect, useRef} from 'react';
import {
  expressionFunctionTexts,
  expressionInPreviewPropertyTexts,
  ExpressionPropertyBase,
  expressionPropertyTexts,
} from '../../../types/Expressions';
import { Alert, Button, Select } from '@digdir/design-system-react';
import { XMarkIcon, PencilIcon, ArrowRightIcon } from '@navikt/aksel-icons';
import { Dynamic, ExpressionElement } from '../../../types/Expressions';
import { ExpressionContent } from './ExpressionContent';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { v4 as uuidv4 } from 'uuid';
import { Trans, useTranslation } from 'react-i18next';
import classes from './DynamicContent.module.css';

interface ExpressionProps {
  component: FormComponent | FormContainer;
  dynamic: Dynamic;

  onGetProperties: (dynamic: Dynamic) => {
    availableProperties: string[];
    expressionProperties: string[];
  }; // actions?
  showRemoveDynamicButton: boolean;
  onAddDynamic: () => void;
  onRemoveDynamic: (dynamic: Dynamic) => void;
  onEditDynamic: (dynamic: Dynamic) => void;
}

export const DynamicContent = ({
    component,
    dynamic,
    onGetProperties,
    onAddDynamic,
    showRemoveDynamicButton,
    onRemoveDynamic,
    onEditDynamic,
}: ExpressionProps) => {
  const [selectedAction, setSelectedAction] = React.useState<string>(dynamic.property || 'default');
  const [expressionElements, setExpressionElements] = React.useState<ExpressionElement[]>(dynamic.expressionElements && [...dynamic.expressionElements]|| []); // default state should be already existing expressions
  const [complexExpression, setComplexExpression] = React.useState<any>(dynamic.complexExpression); // default state should be already existing expressions
  const [operator, setOperator] = React.useState<'og' | 'eller'>(dynamic.operator || undefined);
  const {t} = useTranslation();
  const dynamicInEditStateRef = useRef(null);
  const dynamicInPreviewStateRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Need to check for dropdown explicit because it is rendered in a portal outside the component
      const isDropDown =
        event.target.tagName === 'BUTTON' && event.target.getAttribute('role') === 'option';
      // Check for buttons since clicks outside the dynamic on other buttons should not trigger add dynamic
      const isButton =
        event.target.tagName === 'BUTTON' ||
        event.target.tagName === 'path' ||
        event.target.tagName === 'svg';
      const clickTargetIsNotInDynamic =
        dynamicInEditStateRef.current &&
        !(dynamicInEditStateRef.current as HTMLElement).contains(event.target) &&
        !isDropDown;
      if (clickTargetIsNotInDynamic && !isButton && dynamic.editMode) {
        // Click occurred outside the dynamic in edit mode
        onAddDynamic();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dynamic.editMode, onAddDynamic]);

  const allowToSpecifyExpression = Object.values(
    onGetProperties(dynamic).expressionProperties
  ).includes(selectedAction);
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
    const newExpressionElement: ExpressionElement = {id: uuidv4()};
    dynamic.expressionElements.push(newExpressionElement);
    setExpressionElements(dynamic.expressionElements);
  };

  const addExpressionElement = (dynamicOperator: 'og' | 'eller') => {
    const newExpressionElement: ExpressionElement = {id: uuidv4()};
    const updatedExpressionElements = [...dynamic.expressionElements, newExpressionElement];
    dynamic.expressionElements.push(newExpressionElement);
    setOperator(dynamicOperator);
    dynamic.operator = dynamicOperator;
    setExpressionElements(updatedExpressionElements);
  };

  const updateDynamicOperator = (dynamicOperator: 'og' | 'eller') => {
    setOperator(dynamicOperator);
  };

  const updateExpressionElement = () => {
    const updatedExpressionElements = [...dynamic.expressionElements];
    setExpressionElements(updatedExpressionElements);
  };

  const handleUpdateComplexExpression = (newComplexExpression: any) => {
    try {
      const parsedComplexExpression = JSON.parse(newComplexExpression.replaceAll('\'', '\"'));
      dynamic.complexExpression = JSON.parse(newComplexExpression.replaceAll('\'', '\"'));
      setComplexExpression(parsedComplexExpression);
    }
    catch (error) {
      dynamic.complexExpression = newComplexExpression.length > 0 ? newComplexExpression : '[]';
      setComplexExpression(newComplexExpression);
    }
  }

  const removeExpressionElement = (expressionElement: ExpressionElement) => {
    if (dynamic.expressionElements.length < 2) {
      const newExpressionElement: ExpressionElement = {id: uuidv4()};
      dynamic.expressionElements = [newExpressionElement];
      setExpressionElements([newExpressionElement]);
    } else {
      const updatedExpressionElements = dynamic.expressionElements.filter((expEl: ExpressionElement) => expEl !== expressionElement);
      const lastExpressionElement = updatedExpressionElements[updatedExpressionElements.length - 1];
      dynamic.expressionElements = [...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), {...lastExpressionElement}];
      setExpressionElements([...updatedExpressionElements.filter(expEl => expEl !== lastExpressionElement), {...lastExpressionElement}]);
    }
  };

  const tryFormatExpression = (expression: any): string => {
    try {
      // Implies during editing and when the expression has not been able to be parsed to JSON due to syntax
      if (typeof expression === "string"){
        return expression;
      }
      // Attempt to format the JSON input
      return JSON.stringify(expression).split(',').join(',\n').replaceAll('\"', '\'');
    } catch (error) {
      return expression.toString();
    }
  }

  console.log('dynamic', dynamic); // TODO: Remove when fully tested
  return (
    <>
      {dynamic.editMode ? (
        <div
          className={showRemoveDynamicButton ? classes.dynamicInEdit : null}
          ref={dynamicInEditStateRef}
        >
          {showRemoveDynamicButton && (
            <Button
              className={classes.removeDynamicButton}
              color='danger'
              icon={<XMarkIcon />}
              onClick={() => onRemoveDynamic(dynamic)} // delete dynamic - should also set expression element state back to default
              variant='quiet'
              size='small'
            />
          )}
          <p>
            <Trans
              i18nKey={'right_menu.dynamics_action_on_component'}
              values={{componentName: component.id}}
              components={{bold: <strong/>}}/>
          </p>
          <Select
            onChange={(action) => addActionToDynamic(action)}
            options={[{label: 'Velg handling...', value: 'default'}].concat(
              propertiesList.map((property: string) => ({
              label: expressionPropertyTexts(t)[property],
              value: property
            })))}
            value={dynamic.property || 'default'}
          />
          {dynamic.complexExpression ? (
            <div className={classes.complexExpressionContainer}>
              <textarea
                value={tryFormatExpression(complexExpression)}
                onChange={event => handleUpdateComplexExpression(event.target.value)}
                className={classes.complexExpression}
              />
              <Alert>
                {t('right_menu.dynamics_complex_dynamic_message')}
              </Alert>
            </div>
          ) : (
            expressionElements.map((expEl: ExpressionElement) => (
              <div key={expEl.id}>
                <ExpressionContent // context?
                  expressionAction={allowToSpecifyExpression}
                  expressionElement={expEl}
                  dynamicOperator={operator}
                  onAddExpressionElement={(dynamicOp: 'og' | 'eller') => addExpressionElement(dynamicOp)}
                  onUpdateExpressionElement={updateExpressionElement}
                  onUpdateDynamicOperator={updateDynamicOperator}
                  onRemoveExpressionElement={() => removeExpressionElement(expEl)}
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={classes.dynamicInPreview} ref={dynamicInPreviewStateRef}>
          <div className={classes.dynamicDetails}>
            <span><Trans i18nKey={expressionInPreviewPropertyTexts(t)[dynamic.property]} values={{ componentName: component.id }} components={{ bold: <strong/> }}/></span>
              {expressionElements.map((expEl: ExpressionElement, index: number) => (
                <div key={expEl.id}>
                  <p> <ArrowRightIcon fontSize='1.5rem'/>{expEl.dataSource} {' '} <span>{expEl.value}</span></p>
                  <p className={classes.bold}>{expressionFunctionTexts(t)[expEl.function]}</p>
                  <p> <ArrowRightIcon fontSize='1.5rem'/>{expEl.comparableDataSource} {' '} <span>{expEl.comparableValue}</span></p>
                  {index !== expressionElements.length - 1 && (<p className={classes.bold}>{dynamic.operator}</p>)}
                </div> // add a green checkmark if successful API call to POST layout
              ))}
          </div>
          <div>
            <Button
              color='danger'
              icon={<XMarkIcon />}
              onClick={() => onRemoveDynamic(dynamic)}
              variant='quiet'
              size='small'
            />
            <Button
              icon={<PencilIcon />}
              onClick={() => onEditDynamic(dynamic)}
              variant='quiet'
              size='small'
            />
          </div>
        </div>
      )}
    </>
  );
};
