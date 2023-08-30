import React, { useEffect, useRef } from 'react';
import {
  Expression as IExpression,
  expressionDataSourceTexts,
  SubExpression,
  expressionFunctionTexts,
  expressionInPreviewPropertyTexts,
  expressionPropertyTexts,
  Operator,
} from '../../../types/Expressions';
import { Button, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import { ArrowRightIcon, CheckmarkIcon, PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import { SubExpressionContent } from './SubExpressionContent';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { Trans } from 'react-i18next';
import classes from './Expression.module.css';
import cn from 'classnames';
import {
  addAction,
  addExpression, complexExpressionIsSet, removeSubExpressionAndAddDefaultIfEmpty,
  updateComplexExpression,
  updateExpression,
  updateOperator
} from '../../../utils/expressionsUtils';
import { useText } from '../../../hooks';
import { ComplexExpression } from './ComplexExpression';

interface ExpressionProps {
  component: FormComponent | FormContainer;
  expression: IExpression;
  onGetProperties: (expression: IExpression) => { availableProperties: string[], expressionProperties: string[] };
  showRemoveExpressionButton: boolean;
  onAddExpression: () => void;
  successfullyAddedExpressionId: string;
  onUpdateExpression: (newExpression: IExpression) => void;
  onRemoveExpression: (expression: IExpression) => void;
  onEditExpression: (expression: IExpression) => void;
}

export const Expression = ({
  component,
  expression,
  onGetProperties,
  showRemoveExpressionButton,
  onAddExpression,
  successfullyAddedExpressionId,
  onUpdateExpression,
  onRemoveExpression,
  onEditExpression,
}: ExpressionProps) => {
  const expressionInEditStateRef = useRef(null);
  const expressionInPreviewStateRef = useRef(null);
  const t = useText();

  useEffect(() => {
    const handleClickOutside = (event) => {
      // TODO: Consider the user friendliness of this functionality? Issue: #10858
      // Need to check for dropdown explicit because it is rendered in a portal outside the component
      const isDropDown =
        event.target.tagName === 'BUTTON' && event.target.getAttribute('role') === 'option';
      // Check for buttons since clicks outside the expression on other buttons should not trigger add expression
      const isButton =
        event.target.tagName === 'BUTTON' ||
        event.target.tagName === 'path' ||
        event.target.tagName === 'svg';
      const clickTargetIsNotInExpression =
        expressionInEditStateRef.current &&
        !(expressionInEditStateRef.current as HTMLElement).contains(event.target) &&
        !isDropDown;
      if (clickTargetIsNotInExpression && !isButton && expression.editMode) {
        // Click occurred outside the expression in edit mode
        onAddExpression();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [expression.editMode, onAddExpression]);

  const successfullyAddedMark = expression.id === successfullyAddedExpressionId;
  const allowToSpecifyExpression = Object.values(onGetProperties(expression).expressionProperties).includes(expression.property);
  const propertiesList = onGetProperties(expression).availableProperties;

  const addActionToExpression = (action: string) => {
    const newExpression: IExpression = addAction(expression, action);
    onUpdateExpression(newExpression);
  };

  const addSubExpression = (expressionOperator: Operator) => {
    const newExpression: IExpression = addExpression(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateExpressionOperator = (expressionOperator: Operator) => {
    const newExpression: IExpression = updateOperator(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateSubExpression = (index: number, subExpression: SubExpression) => {
    const newExpression: IExpression = updateExpression(expression, index, subExpression);
    onUpdateExpression(newExpression);
  };

  const updateExpressionComplexExpression = (newComplexExpression: any) => {
    const newExpression: IExpression = updateComplexExpression(expression, newComplexExpression);
    onUpdateExpression(newExpression);
  };

  const removeSubExpression = (subExpression: SubExpression) => {
    const newExpression: IExpression = removeSubExpressionAndAddDefaultIfEmpty(expression, subExpression);
    onUpdateExpression(newExpression);
  };

  console.log('expression', expression); // TODO: Remove when fully tested
  return (
    <>
      {expression.editMode ? (
        <div
          className={classes.editMode}
          ref={expressionInEditStateRef}
        >
          <div className={classes.topBar}>
            <p>
              <Trans
                i18nKey={'right_menu.expressions_action_on_component'}
                values={{ componentName: component.id }}
                components={{ bold: <strong/> }}
              />
            </p>
            {showRemoveExpressionButton && (
              <Button
                color='danger'
                icon={<TrashIcon />}
                onClick={() => onRemoveExpression(expression)}
                variant='quiet'
                size='small'
              />
            )}
          </div>
          <Select
            onChange={(action) => addActionToExpression(action)}
            options={[{ label: 'Velg handling...', value: 'default' }].concat(propertiesList.map((property: string) => ({
              label: expressionPropertyTexts(t)[property],
              value: property
            })))}
            value={expression.property || 'default'}
          />
          {complexExpressionIsSet(expression.complexExpression) ? (
            <ComplexExpression
              expression={expression}
              onChange={updateExpressionComplexExpression}
            />
          ) : (
            expression.subExpressions.map((subExp: SubExpression, index: number) => (
              <div key={subExp.id}>
                <SubExpressionContent
                  expressionAction={allowToSpecifyExpression}
                  subExpression={subExp}
                  expression={expression}
                  index={index}
                  onAddSubExpression={(expressionOp: Operator) => addSubExpression(expressionOp)}
                  onUpdateSubExpression={(subExpression: SubExpression) => updateSubExpression(index, subExpression)}
                  onUpdateExpressionOperator={(expressionOp: Operator) => updateExpressionOperator(expressionOp)}
                  onRemoveSubExpression={() => removeSubExpression(subExp)}
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={classes.previewMode} ref={expressionInPreviewStateRef}>
          <div className={classes.expressionDetails}>
            <span>
              <Trans
                i18nKey={expressionInPreviewPropertyTexts(t)[expression.property]}
                values={{ componentName: component.id }}
                components={{ bold: <strong/> }}
              />
            </span>
            {complexExpressionIsSet(expression.complexExpression) ? (
              <ComplexExpression expression={expression} disabled/>
            ) : (
              expression.subExpressions.map((subExp: SubExpression, index: number) => (
                <div key={subExp.id}>
                  <p>
                    <ArrowRightIcon fontSize='1.5rem'/>
                    {expressionDataSourceTexts(t)[subExp.dataSource]}
                    <span>{subExp.value}</span>
                  </p>
                  <p className={classes.bold}>{expressionFunctionTexts(t)[subExp.function]}</p>
                  <p>
                    <ArrowRightIcon fontSize='1.5rem'/>
                    {expressionDataSourceTexts(t)[subExp.comparableDataSource]}
                    <span>{subExp.comparableValue}</span>
                  </p>
                  {index !== expression.subExpressions.length - 1 && (
                    <p className={classes.bold}>{expression.operator === Operator.And ? 'Og' : 'Eller'}</p>
                  )}
                </div>
              ))
            )}
            {successfullyAddedMark && (
              <div className={classes.checkMark}>
                <CheckmarkIcon fontSize='1.5rem'/>{t('right_menu.expression_successfully_added_text')}
              </div>
            )}
          </div>
          <div>
            <Button
              color='danger'
              icon={<TrashIcon />}
              onClick={() => onRemoveExpression(expression)}
              variant='quiet'
              size='small'
            />
            <Button
              icon={<PencilIcon />}
              onClick={() => onEditExpression(expression)}
              variant='quiet'
              size='small'
            />
          </div>
        </div>
      )}
    </>
  );
};
