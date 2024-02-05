import React from 'react';
import classes from '../ExpressionContent.module.css';
import type { Expression } from '../../../../../types/Expressions';
import { expressionInPreviewPropertyTextKeys } from '../../../../../types/Expressions';
import { complexExpressionIsSet } from '../../../../../utils/expressionsUtils';
import { ComplexExpression } from '../ComplexExpression';
import { SimpleExpressionPreview } from './SimpleExpressionPreview';
import { StudioButton } from '@studio/components';
import { PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import { useText } from '../../../../../hooks';
import cn from 'classnames';
import { Trans } from 'react-i18next';

export interface ExpressionPreviewProps {
  expression: Expression;
  componentName: string;
  onSetEditMode: (editMode: boolean) => void;
  onDeleteExpression: (expression: Expression) => void;
}

export const ExpressionPreview = ({
  expression,
  componentName,
  onSetEditMode,
  onDeleteExpression,
}: ExpressionPreviewProps) => {
  const t = useText();

  return (
    <div className={cn(classes.previewMode, classes.expressionContainer)}>
      <div className={classes.expressionDetails}>
        <span>
          <Trans
            i18nKey={expressionInPreviewPropertyTextKeys[expression.property]}
            values={{ componentName: componentName }}
            components={{ bold: <strong /> }}
          />
        </span>
        {complexExpressionIsSet(expression.complexExpression) ? (
          <ComplexExpression expression={expression} disabled />
        ) : (
          <SimpleExpressionPreview expression={expression} />
        )}
      </div>
      <div>
        <StudioButton
          title={t('right_menu.expression_delete')}
          color='danger'
          icon={<TrashIcon />}
          onClick={() => onDeleteExpression(expression)}
          variant='tertiary'
          size='small'
        />
        <StudioButton
          title={t('right_menu.expression_edit')}
          icon={<PencilIcon />}
          onClick={() => onSetEditMode(true)}
          variant='tertiary'
          size='small'
        />
      </div>
    </div>
  );
};
