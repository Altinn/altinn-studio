import React from 'react';
import classes from '../ExpressionContent.module.css';
import { Expression, expressionInPreviewPropertyTextKeys } from '../../../../../types/Expressions';
import { complexExpressionIsSet } from '../../../../../utils/expressionsUtils';
import { ComplexExpression } from '../ComplexExpression';
import { SimpleExpressionPreview } from './SimpleExpressionPreview';
import { Button } from '@digdir/design-system-react';
import { CheckmarkIcon, PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import { useText } from '../../../../../hooks';
import cn from 'classnames';
import { Trans } from 'react-i18next';

export interface ExpressionPreviewProps {
  expression: Expression;
  componentName: string;
  successfullyAddedCheckMark: boolean;
  onSetEditMode: (editMode: boolean) => void;
  onDeleteExpression: (expression: Expression) => void;
}

export const ExpressionPreview = ({
  expression,
  componentName,
  successfullyAddedCheckMark,
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
        {successfullyAddedCheckMark && (
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
          onClick={() => onDeleteExpression(expression)}
          variant='tertiary'
          size='small'
        />
        <Button
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
