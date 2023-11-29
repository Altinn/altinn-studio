import React, { useState } from 'react';
import {
  Expression,
  expressionInPreviewPropertyTextKeys,
  Operator,
  SubExpression,
} from '../../../../../types/Expressions';
import {
  addSubExpressionToExpression,
  canExpressionBeSaved,
  complexExpressionIsSet,
  convertInternalExpressionToExternal,
  isStudioFriendlyExpression,
  tryParseExpression,
  updateComplexExpressionOnExpression,
  updateOperatorOnExpression,
  updateSubExpressionOnExpression,
} from '../../../../../utils/expressionsUtils';
import { ComplexExpression } from '../ComplexExpression';
import { SimpleExpression } from './SimpleExpression';
import { Button, Switch } from '@digdir/design-system-react';
import { CheckmarkIcon, PlusCircleIcon, TrashIcon } from '@navikt/aksel-icons';
import { Trans } from 'react-i18next';
import classes from '../ExpressionContent.module.css';
import { stringifyData } from '../../../../../utils/jsonUtils';
import { useText } from '../../../../../hooks';

export interface ExpressionEditModeProps {
  expression: Expression;
  componentName: string;
  onSetEditMode: (editMode: boolean) => void;
  onDeleteExpression: (expression: Expression) => void;
  onDeleteSubExpression: (subExpression: SubExpression) => void;
  onSaveExpression: (expression: Expression) => void;
  onSetExpression: (expression: Expression) => void;
}

export const ExpressionEditMode = ({
  expression,
  componentName,
  onSetEditMode,
  onDeleteExpression,
  onDeleteSubExpression,
  onSaveExpression,
  onSetExpression,
}: ExpressionEditModeProps) => {
  const [freeStyleEditing, setFreeStyleEditing] = useState<boolean>(!!expression.complexExpression);
  const t = useText();

  const addSubExpression = (expressionOperator: Operator) => {
    const newExpression: Expression = addSubExpressionToExpression(expression, expressionOperator);
    onSetExpression(newExpression);
  };

  const updateOperator = (expressionOperator: Operator) => {
    const newExpression: Expression = updateOperatorOnExpression(expression, expressionOperator);
    onSetExpression(newExpression);
  };

  const updateSubExpression = (index: number, subExpression: SubExpression) => {
    const newExpression: Expression = updateSubExpressionOnExpression(
      expression,
      index,
      subExpression,
    );
    onSetExpression(newExpression);
  };

  const updateComplexExpression = (newComplexExpression: any) => {
    const newExpression: Expression = updateComplexExpressionOnExpression(
      expression,
      newComplexExpression,
    );
    onSetExpression(newExpression);
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

  const allowToSaveExpression = canExpressionBeSaved(expression);
  const externalExpression = convertInternalExpressionToExternal(expression);
  const isStudioFriendly = isStudioFriendlyExpression(
    tryParseExpression(expression, externalExpression).complexExpression,
  );

  return (
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
            i18nKey={expressionInPreviewPropertyTextKeys[expression.property]}
            values={{ componentName: componentName }}
            components={{ bold: <strong /> }}
          />
        </p>
        <Button
          aria-label={t('right_menu.expression_delete')}
          color='danger'
          icon={<TrashIcon />}
          onClick={() => onDeleteExpression(expression)}
          variant='tertiary'
          size='small'
        />
      </div>
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
            onUpdateExpressionOperator={(expressionOp: Operator) => updateOperator(expressionOp)}
            onRemoveSubExpression={(subExp: SubExpression) => onDeleteSubExpression(subExp)}
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
        onClick={() => {
          onSetEditMode(false);
          onSaveExpression(expression);
        }}
        variant='primary'
        size='small'
        disabled={!allowToSaveExpression}
      >
        {t('right_menu.expression_save')}
      </Button>
    </div>
  );
};
