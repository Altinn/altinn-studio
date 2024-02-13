import type { SimpleLogicalExpression } from '../../../types/SimplifiedExpression';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../StudioExpressionContext';
import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import { Paragraph } from '@digdir/design-system-react';
import classes from './OperatorBetweenSubExpressions.module.css';

export type OperatorBetweenSubExpressionsProps = {
  logicalExpression: SimpleLogicalExpression;
};

export const OperatorBetweenSubExpressions = ({
  logicalExpression,
}: OperatorBetweenSubExpressionsProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const text =
    logicalExpression.subExpressions.length > 1
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
