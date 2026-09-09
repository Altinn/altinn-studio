import type { SimpleLogicalExpression } from '../../../types/SimplifiedExpression';
import React from 'react';
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import classes from './OperatorBetweenSubexpressions.module.css';
import { StudioParagraph } from '../../../../StudioParagraph';

export type OperatorBetweenSubexpressionsProps = {
  logicalExpression: SimpleLogicalExpression;
};

export const OperatorBetweenSubexpressions = ({
  logicalExpression,
}: OperatorBetweenSubexpressionsProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  const text =
    logicalExpression.subexpressions.length > 1
      ? logicalExpression.logicalOperator === LogicalTupleOperator.And
        ? texts.and
        : texts.or
      : texts.andOr;

  return <StudioParagraph className={classes.operator}>{text}</StudioParagraph>;
};
