import React, { useState } from 'react';
import {
  Expression,
  SubExpression,
  expressionInPreviewPropertyTexts,
  expressionPropertyTexts,
  Operator,
} from '../../../types/Expressions';
import { Button, Select, Switch } from '@digdir/design-system-react';
import { CheckmarkIcon, PencilIcon, PlusCircleIcon, TrashIcon } from '@navikt/aksel-icons';
import { Trans } from 'react-i18next';
import classes from './ExpressionContent.module.css';
import cn from 'classnames';
import {
  addPropertyToExpression,
  addSubExpressionToExpression,
  complexExpressionIsSet,
  convertInternalExpressionToExternal,
  isStudioFriendlyExpression,
  tryParseExpression,
  updateComplexExpressionOnExpression,
  updateSubExpressionOnExpression,
  updateOperatorOnExpression,
} from '../../../utils/expressionsUtils';
import { useText } from '../../../hooks';
import { ComplexExpression } from './ComplexExpression';
import { SimpleExpression } from './SimpleExpression';
import { SimpleExpressionPreview } from './SimpleExpressionPreview';
import { stringifyData } from '../../../utils/jsonUtils';
import { ExpressionState } from './Expressions';

export interface ExpressionContentProps {
  componentName: string;
  expressionState: ExpressionState;
  onGetProperties: () => string[];
  onSaveExpression: (expression: Expression) => void;
  successfullyAddedExpression: boolean;
  onUpdateExpression: (newExpression: Expression) => void;
  onRemoveExpression: (expression: Expression) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
  onEditExpression: (expression: Expression) => void;
}

export const ExpressionContent = ({
  componentName,
  expressionState,
  onGetProperties,
  onSaveExpression,
  successfullyAddedExpression,
  onUpdateExpression,
  onRemoveExpression,
  onRemoveSubExpression,
  onEditExpression,
}: ExpressionContentProps) => {
  const expression = expressionState.expression;
  const expressionInEditMode = expressionState.editMode;
  const [freeStyleEditing, setFreeStyleEditing] = useState<boolean>(!!expression.complexExpression);
  const t = useText();

  const allowToSaveExpression =
    (expression.subExpressions?.filter((subExp) => !subExp.function)?.length === 0 &&
      expression.subExpressions.length !== 0 &&
      expressionInEditMode &&
      !!expression.property) ||
    (complexExpressionIsSet(expression.complexExpression) &&
      expressionInEditMode &&
      !!expression.property);
  const availableProperties = onGetProperties();
  const externalExpression = convertInternalExpressionToExternal(expression);
  const isStudioFriendly = isStudioFriendlyExpression(
    tryParseExpression(expression, externalExpression).complexExpression,
  );

  const addProperty = (property: string) => {
    const newExpression: Expression = addPropertyToExpression(expression, property);
    onUpdateExpression(newExpression);
  };

  const addSubExpression = (expressionOperator: Operator) => {
    const newExpression: Expression = addSubExpressionToExpression(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateOperator = (expressionOperator: Operator) => {
    const newExpression: Expression = updateOperatorOnExpression(expression, expressionOperator);
    onUpdateExpression(newExpression);
  };

  const updateSubExpression = (index: number, subExpression: SubExpression) => {
    const newExpression: Expression = updateSubExpressionOnExpression(
      expression,
      index,
      subExpression,
    );
    onUpdateExpression(newExpression);
  };

  const updateComplexExpression = (newComplexExpression: any) => {
    const newExpression: Expression = updateComplexExpressionOnExpression(
      expression,
      newComplexExpression,
    );
    onUpdateExpression(newExpression);
  };

  const handleToggleFreeStyleEditing = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFreeStyleEditing(event.target.checked);
    if (event.target.checked) {
      const stringRepresentationOfExpression = stringifyData(externalExpression);
      updateComplexExpression(stringRepresentationOfExpression);
    } else {
      updateComplexExpression(undefined);
    }
  };

  return (
    <>
      {expressionInEditMode ? (
        <div className={classes.expressionContainer}>
          <Switch
            name={'Expression_enable_free_style_editing'}
            onChange={handleToggleFreeStyleEditing}
            checked={freeStyleEditing}
            size={'small'}
            readOnly={!isStudioFriendly}
          >
            {t('right_menu.expression_enable_free_style_editing')}
          </Switch>
          <div className={classes.topBar}>
            <p>
              <Trans
                i18nKey={'right_menu.expressions_property_on_component'}
                values={{ componentName: componentName }}
                components={{ bold: <strong /> }}
              />
            </p>
            <Button
              aria-label={t('right_menu.expression_delete')}
              color='danger'
              icon={<TrashIcon />}
              onClick={() => onRemoveExpression(expression)}
              variant='tertiary'
              size='small'
            />
          </div>
          <Select
            label={t('right_menu.expressions_property')}
            hideLabel={true}
            onChange={addProperty}
            options={[
              { label: t('right_menu.expressions_property_select'), value: 'default' },
              {
                label: expressionPropertyTexts(t)[expression.property],
                value: expression.property,
              },
            ].concat(
              availableProperties.map((property: string) => ({
                label: expressionPropertyTexts(t)[property],
                value: property,
              })),
            )}
            value={expression.property || 'default'}
          />
          {complexExpressionIsSet(expression.complexExpression) ? (
            <ComplexExpression
              expression={expression}
              onChange={updateComplexExpression}
              isStudioFriendly={isStudioFriendly}
            />
          ) : (
            <div className={classes.subExpression}>
              <SimpleExpression
                expression={expression}
                onUpdateSubExpression={(index: number, subExpression: SubExpression) =>
                  updateSubExpression(index, subExpression)
                }
                onUpdateExpressionOperator={(expressionOp: Operator) =>
                  updateOperator(expressionOp)
                }
                onRemoveSubExpression={(subExp: SubExpression) => onRemoveSubExpression(subExp)}
              />
              <Button
                variant='tertiary'
                size='small'
                onClick={() => addSubExpression(expression.operator || Operator.And)}
                icon={<PlusCircleIcon />}
              >
                {t('right_menu.expressions_add_sub_expression')}
              </Button>
            </div>
          )}
          <Button
            color='success'
            icon={<CheckmarkIcon />}
            onClick={() => onSaveExpression(expression)}
            variant='primary'
            size='small'
            disabled={!allowToSaveExpression}
          >
            {t('general.save')}
          </Button>
        </div>
      ) : (
        <div className={cn(classes.previewMode, classes.expressionContainer)}>
          <div className={classes.expressionDetails}>
            <span>
              <Trans
                i18nKey={expressionInPreviewPropertyTexts(t)[expression.property]}
                values={{ componentName: componentName }}
                components={{ bold: <strong /> }}
              />
            </span>
            {complexExpressionIsSet(expression.complexExpression) ? (
              <ComplexExpression expression={expression} disabled />
            ) : (
              <SimpleExpressionPreview expression={expression} />
            )}
            {successfullyAddedExpression && (
              <div className={classes.checkMark}>
                <CheckmarkIcon fontSize='1.5rem' />
                {t('right_menu.expression_successfully_added_text')}
              </div>
            )}
          </div>
          <div>
            <Button
              title={t('right_menu.expression_delete')}
              color='danger'
              icon={<TrashIcon />}
              onClick={() => onRemoveExpression(expression)}
              variant='tertiary'
              size='small'
            />
            <Button
              title={t('right_menu.expression_edit')}
              icon={<PencilIcon />}
              onClick={() => onEditExpression(expression)}
              variant='tertiary'
              size='small'
            />
          </div>
        </div>
      )}
    </>
  );
};
