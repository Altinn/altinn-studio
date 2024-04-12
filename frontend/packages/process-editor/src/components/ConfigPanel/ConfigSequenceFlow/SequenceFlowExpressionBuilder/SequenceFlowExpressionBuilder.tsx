import React, { useState } from 'react';
import { Fieldset, NativeSelect } from '@digdir/design-system-react';
import { TranslationKey } from '@altinn-studio/language/type';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';

import classes from './SequenceFlowExpressionBuilder.module.css';

const mapExpressionObjectToExpressionString = (expression: ExpressionObject): string => {
  return JSON.stringify([
    expression.operator,
    [expression.expressionAgainst || 'gatewayAction'],
    expression.action,
  ]);
};

const mapExpressionStringToObject = (expressionString: string): ExpressionObject => {
  const [operator, expressionAgainst, action] = JSON.parse(expressionString);
  return {
    expressionAgainst,
    operator,
    action,
  };
};

enum UserGatewayAction {
  Confirm = 'confirm',
  Pay = 'pay',
  Reject = 'reject',
  Sign = 'sign',
}

enum ExpressionFunction {
  Equals = 'equals',
  NotEquals = 'notEquals',
  Not = 'not',
}

const expressionFunctionsTextMap = (
  t: (key: TranslationKey) => string,
): Record<ExpressionFunction, string> => ({
  [ExpressionFunction.Equals]: t('right_menu.expressions_function_equals'),
  [ExpressionFunction.NotEquals]: t('right_menu.expressions_function_not_equals'),
  [ExpressionFunction.Not]: t('right_menu.expressions_function_not'),
});

type ExpressionObject = {
  expressionAgainst: 'gatewayAction';
  operator: string;
  action: string;
};

type SequenceFlowExpressionBuilderProps = {
  expression?: string;
  onSave: (expression: string) => void;
  onDelete: () => void;
};

export const SequenceFlowExpressionBuilder = ({
  expression: givenExpression,
  onSave,
  onDelete,
}: SequenceFlowExpressionBuilderProps): React.ReactElement => {
  const { t } = useTranslation();
  const [expression, setExpression] = useState<ExpressionObject>(
    givenExpression
      ? mapExpressionStringToObject(givenExpression)
      : {
          expressionAgainst: 'gatewayAction',
          operator: '',
          action: '',
        },
  );

  const userGatewayActions = Object.values(UserGatewayAction);
  const availableOperators = Object.values(ExpressionFunction);
  const isExpressionInvalid: boolean = !expression?.operator || !expression?.action;

  const handleExpressionChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    key: keyof ExpressionObject,
  ): void => {
    setExpression((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSaveClicked = (): void => {
    onSave(mapExpressionObjectToExpressionString(expression));
  };

  return (
    <Fieldset className={classes.container} size='small' legend='Flytkontroll-verktøy' hideLegend>
      <NativeSelect
        label='Utrykk mot'
        className={classes.formControlSpacing}
        value={expression?.expressionAgainst}
        onChange={(event) => handleExpressionChange(event, 'expressionAgainst')}
      >
        <option value='gatewayAction'>Gateway action</option>
      </NativeSelect>

      <NativeSelect
        label='Operator'
        value={expression?.operator}
        className={classes.formControlSpacing}
        onChange={(event) => handleExpressionChange(event, 'operator')}
      >
        {availableOperators.map((operator) => (
          <option value={operator} key={operator}>
            {expressionFunctionsTextMap(t)[operator]}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        label='Velg brukerhandling'
        value={expression?.action}
        onChange={(event) => handleExpressionChange(event, 'action')}
      >
        {userGatewayActions.map((action) => (
          <option value={action} key={action}>
            {action}
          </option>
        ))}
      </NativeSelect>

      <div className={classes.actionButtonContainer}>
        <StudioButton variant='primary' onClick={onSaveClicked} disabled={isExpressionInvalid}>
          {t('general.save')}
        </StudioButton>
        <StudioButton variant='secondary' onClick={onDelete} color='danger'>
          {t('general.delete')}
        </StudioButton>
      </div>
    </Fieldset>
  );
};
