import React from 'react';
import {
  Expression,
  SubExpression,
  expressionInPreviewPropertyTexts,
  expressionPropertyTexts,
  Operator,
} from '../../../types/Expressions';
import { Button, Select } from '@digdir/design-system-react';
import { CheckmarkIcon, PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import { FormComponent } from '../../../types/FormComponent';
import { FormContainer } from '../../../types/FormContainer';
import { Trans } from 'react-i18next';
import classes from './ExpressionContent.module.css';
import {
  addProperty,
  addSubExpressionToExpression,
  complexExpressionIsSet,
  removeSubExpressionAndAdaptParentProps,
  updateComplexExpression,
  updateExpression,
  updateOperator
} from '../../../utils/expressionsUtils';
import { useText } from '../../../hooks';
import { ComplexExpression } from './ComplexExpression';
import { SimpleExpression } from './SimpleExpression';
import { SimpleExpressionPreview } from './SimpleExpressionPreview';

interface ExpressionContentProps {
  component: FormComponent | FormContainer;
  expression: Expression;
  onGetProperties: (expression: Expression) => { availableProperties: string[], expressionProperties: string[] };
  showRemoveExpressionButton: boolean;
  onSaveExpression: (expression: Expression) => void;
  successfullyAddedExpressionId: string;
  expressionInEditModeId: string;
  onUpdateExpression: (newExpression: Expression) => void;
  onRemoveExpression: (expression: Expression) => void;
  onEditExpression: (expression: Expression) => void;
}

export const ExpressionContent = ({
  component,
  expression,
  onGetProperties,
  showRemoveExpressionButton,
  onSaveExpression,
  successfullyAddedExpressionId,
  expressionInEditModeId,
  onUpdateExpression,
  onRemoveExpression,
  onEditExpression,
}: ExpressionContentProps) => {
  const t = useText();

  const expressionInEditMode = expression.id === expressionInEditModeId;
  const successfullyAddedMark = expression.id === successfullyAddedExpressionId;
  const allowToSpecifyExpression = Object.values(onGetProperties(expression).expressionProperties).includes(expression.property);
  const allowToSaveExpression = (
    expression.subExpressions?.filter(subExp => !subExp.function)?.length === 0
    && expression.subExpressions.length !== 0
    && expressionInEditMode
    && !!expression.property
  ) || (
    complexExpressionIsSet(expression.complexExpression)
    && expressionInEditMode
    && !!expression.property
  );
  const propertiesList = onGetProperties(expression).availableProperties;

  const addPropertyToExpression = (property: string) => {
    const newExpression: Expression = addProperty(expression, property);
    onUpdateExpression(newExpression);
  };

  const addSubExpression = (expressionOperator: Operator) => {
    const newExpression: Expression = addSubExpressionToExpression(expression, expressionOperator);
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
    const newExpression: Expression = removeSubExpressionAndAdaptParentProps(expression, subExpression);
    onUpdateExpression(newExpression);
  };

  return (
    <>
      {expressionInEditMode ? (
        <div className={classes.editMode}>
          <div className={classes.topBar}>
            <p>
              <Trans
                i18nKey={'right_menu.expressions_property_on_component'}
                values={{ componentName: component.id }}
                components={{ bold: <strong/> }}
              />
            </p>
            {showRemoveExpressionButton && (
              <Button
                color='danger'
                icon={<TrashIcon/>}
                onClick={() => onRemoveExpression(expression)}
                variant='quiet'
                size='small'
              />
            )}
          </div>
          <Select
            onChange={property => addPropertyToExpression(property)}
            options={[{ label: t('right_menu.expressions_property_select'), value: 'default' }].concat(propertiesList.map((property: string) => ({
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
            <SimpleExpression
              allowToSpecifyExpression={allowToSpecifyExpression}
              expression={expression}
              onAddSubExpression={(expressionOp: Operator) => addSubExpression(expressionOp)}
              onUpdateSubExpression={(index: number, subExpression: SubExpression) => updateSubExpression(index, subExpression)}
              onUpdateExpressionOperator={(expressionOp: Operator) => updateExpressionOperator(expressionOp)}
              onRemoveSubExpression={(subExp: SubExpression) => removeSubExpression(subExp)}
            />
          )}
          {allowToSaveExpression && (
            <Button
              color='success'
              icon={<CheckmarkIcon/>}
              onClick={() => onSaveExpression(expression)}
              variant='filled'
              size='small'
            >{t('general.save')}</Button>
          )}
        </div>
      ) : (
        <div className={classes.previewMode}>
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
              <SimpleExpressionPreview
                expression={expression}
              />
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
              icon={<TrashIcon/>}
              onClick={() => onRemoveExpression(expression)}
              variant='quiet'
              size='small'
            />
            <Button
              icon={<PencilIcon/>}
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
