import React, { useEffect, useRef } from 'react';
import {
  Expression, expressionDataSourceTexts,
  SubExpression,
  expressionFunctionTexts,
  expressionInPreviewPropertyTexts,
  expressionPropertyTexts,
  Operator,
} from '../../../types/Expressions';
import { Alert, Button, Select, TextArea } from '@digdir/design-system-react';
import { ArrowRightIcon, CheckmarkIcon, PencilIcon, XMarkIcon } from '@navikt/aksel-icons';
import { SubExpressionContent } from './SubExpressionContent';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { Trans, useTranslation } from 'react-i18next';
import classes from './ExpressionContent.module.css';
import {
  addAction,
  addExpression, complexExpressionIsSet, removeSubExpressionAndAddDefaultIfEmpty,
  updateComplexExpression,
  updateExpression,
  updateOperator
} from '../../../utils/expressionsUtils';

interface ExpressionProps {
  component: FormComponent | FormContainer;
  expression: Expression;
  onGetProperties: (expression: Expression) => { availableProperties: string[], expressionProperties: string[] };
  showRemoveExpressionButton: boolean;
  onAddExpression: () => void;
  successfullyAddedExpressionId: string;
  onUpdateExpression: (newExpression: Expression) => void;
  onRemoveExpression: (expression: Expression) => void;
  onEditExpression: (expression: Expression) => void;
}

export const ExpressionContent = ({
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
  const { t } = useTranslation();

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
    const newExpression: Expression = addAction(expression, action);
    onUpdateExpression(newExpression);
  };

  const addSubExpression = (expressionOperator: Operator) => {
    const newExpression: Expression = addExpression(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateExpressionOperator = (expressionOperator: Operator) => {
    const newExpression: Expression = updateOperator(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateSubExpression = (index: number, subExpression: SubExpression) => {
    const newExpression: Expression = updateExpression(expression, index, subExpression);
    onUpdateExpression(newExpression);
  };

  const updateExpressionComplexExpression = (newComplexExpression: any) => {
    const newExpression: Expression = updateComplexExpression(expression, newComplexExpression);
    onUpdateExpression(newExpression);
  };

  const removeSubExpression = (subExpression: SubExpression) => {
    const newExpression: Expression = removeSubExpressionAndAddDefaultIfEmpty(expression, subExpression);
    onUpdateExpression(newExpression);
  };

  const tryFormatExpression = (expression: any): string => {
    try {
      // Implies during editing and when the expression has not been able to be parsed to JSON due to syntax
      if (typeof expression === 'string') {
        return expression;
      }
      // Attempt to format the JSON input
      return JSON.stringify(expression);
    } catch (error) {
      return expression.toString();
    }
  };

  console.log('expression', expression); // TODO: Remove when fully tested
  return (
    <>
      {expression.editMode ? (
        <div
          className={showRemoveExpressionButton ? classes.expressionInEdit : null}
          ref={expressionInEditStateRef}
        >
          {showRemoveExpressionButton && (
            <Button
              className={classes.removeExpressionButton}
              color='danger'
              icon={<XMarkIcon />}
              onClick={() => onRemoveExpression(expression)}
              variant='quiet'
              size='small'
            />
          )}
          <p>
            <Trans
              i18nKey={'right_menu.dynamics_action_on_component'}
              values={{ componentName: component.id }}
              components={{ bold: <strong/> }}/>
          </p>
          <Select
            onChange={(action) => addActionToExpression(action)}
            options={[{ label: 'Velg handling...', value: 'default' }].concat(propertiesList.map((property: string) => ({
              label: expressionPropertyTexts(t)[property],
              value: property
            })))}
            value={expression.property || 'default'}
          />
          {complexExpressionIsSet(expression.complexExpression) ? (
            <div className={classes.complexExpressionContainer}>
              <TextArea
                value={tryFormatExpression(expression.complexExpression)}
                onChange={event => updateExpressionComplexExpression(event.target.value)}
              />
              <Alert>
                {t('right_menu.dynamics_complex_dynamic_message')}
              </Alert>
            </div>
          ) : (
            expression.subExpressions.map((subExp: SubExpression, index: number) => (
              <div key={subExp.id}>
                <SubExpressionContent
                  expressionAction={allowToSpecifyExpression}
                  subExpression={subExp}
                  expressionOperator={index == expression.subExpressions.length - 1 ? undefined : expression.operator}
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
        <div className={classes.expressionInPreview} ref={expressionInPreviewStateRef}>
          <div className={classes.expressionDetails}>
            <span>
              <Trans
                i18nKey={expressionInPreviewPropertyTexts(t)[expression.property]}
                values={{ componentName: component.id }}
                components={{ bold: <strong/> }}
              />
            </span>
            {complexExpressionIsSet(expression.complexExpression) ? (
              <div className={classes.complexExpressionContainer}>
                  <TextArea
                    className={classes.complexExpression}
                    value={tryFormatExpression(expression.complexExpression)}
                    disabled={true}
                  />
                <Alert>
                  {t('right_menu.dynamics_complex_dynamic_message')}
                </Alert>
              </div>
            ) : (
              expression.subExpressions.map((subExp: SubExpression, index: number) => (
                <div key={subExp.id}>
                  <p><ArrowRightIcon fontSize='1.5rem'/>{expressionDataSourceTexts(t)[subExp.dataSource]} {' '}
                    <span>{subExp.value}</span></p>
                  <p className={classes.bold}>{expressionFunctionTexts(t)[subExp.function]}</p>
                  <p><ArrowRightIcon fontSize='1.5rem'/>{expressionDataSourceTexts(t)[subExp.comparableDataSource]} {' '}
                    <span>{subExp.comparableValue}</span></p>
                  {index !== expression.subExpressions.length - 1 && (
                    <p className={classes.bold}>{expression.operator === Operator.And ? 'Og' : 'Eller'}</p>)}
                </div>
              ))
            )}
            {successfullyAddedMark && (
              <div className={classes.checkMark}>
                <CheckmarkIcon fontSize='1.5rem'/>{t('right_menu.dynamics_successfully_added_text')}
              </div>
            )}
          </div>
          <div>
            <Button
              color='danger'
              icon={<XMarkIcon />}
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
