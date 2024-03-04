import React from 'react';
import type { Expression } from '../types/Expression';
import { isExpressionSimple } from '../validators/isExpressionSimple';
import { Alert } from '@digdir/design-system-react';
import { complexToSimpleExpression } from '../converters/complexToSimpleExpression';
import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import { simpleToComplexExpression } from '../converters/simpleToComplexExpression';
import { InternalFormatEditor } from './InternalFormatEditor';
import { useStudioExpressionContext } from '../StudioExpressionContext';

export type SimplifiedEditorProps = {
  expression: Expression;
  onChange: (expression: Expression) => void;
};

export const SimplifiedEditor = ({ expression, onChange }: SimplifiedEditorProps) => {
  const { texts } = useStudioExpressionContext();

  if (!isExpressionSimple(expression)) {
    return <Alert severity='info'>{texts.cannotSimplify}</Alert>;
  }

  const simplifiedExpression = complexToSimpleExpression(expression);

  const handleChange = (updatedExpression: SimplifiedExpression) => {
    const updatedComplexExpression = simpleToComplexExpression(updatedExpression);
    onChange(updatedComplexExpression);
  };

  return (
    <InternalFormatEditor simplifiedExpression={simplifiedExpression} onChange={handleChange} />
  );
};
