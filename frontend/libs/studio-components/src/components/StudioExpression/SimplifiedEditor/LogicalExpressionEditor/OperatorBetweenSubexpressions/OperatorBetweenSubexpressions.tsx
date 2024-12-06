import type { SimpleLogicalExpression } from '../../../types/SimplifiedExpression';
import React from 'react';
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import { Paragraph } from '@digdir/designsystemet-react';
import classes from './OperatorBetweenSubexpressions.module.css';

export type OperatorBetweenSubexpressionsProps = {
  logicalExpression: SimpleLogicalExpression;
};

export const OperatorBetweenSubexpressions = ({
  logicalExpression,
}: OperatorBetweenSubexpressionsProps) => {
  const { texts } = useStudioExpressionContext();

  const text =
    logicalExpression.subexpressions.length > 1
      ? logicalExpression.logicalOperator === LogicalTupleOperator.And
        ? texts.and
        : texts.or
      : texts.andOr;

  return (
    <Paragraph size='small' className={classes.operator}>
      {text}
    </Paragraph>
  );
};
