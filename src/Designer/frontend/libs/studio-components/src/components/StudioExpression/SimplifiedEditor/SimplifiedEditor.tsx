import React from 'react';
import type { Expression } from '../types/Expression';
import { isExpressionSimple } from '../validators/isExpressionSimple';
import { StudioAlert } from '../../StudioAlert';
import { complexToSimpleExpression } from '../converters/complexToSimpleExpression';
import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import { simpleToComplexExpression } from '../converters/simpleToComplexExpression';
import { InternalFormatEditor } from './InternalFormatEditor';
import { useStudioExpressionContext } from '../StudioExpressionContext';

export type SimplifiedEditorProps = {
  expression: Expression;
  showAddSubexpression?: boolean;
  onChange: (expression: Expression) => void;
};

export const SimplifiedEditor = ({
  expression,
  showAddSubexpression,
  onChange,
}: SimplifiedEditorProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  if (!isExpressionSimple(expression)) {
    return <StudioAlert data-color='info'>{texts.cannotSimplify}</StudioAlert>;
  }

  const simplifiedExpression = complexToSimpleExpression(expression);

  const handleChange = (updatedExpression: SimplifiedExpression): void => {
    const updatedComplexExpression = simpleToComplexExpression(updatedExpression);
    onChange(updatedComplexExpression);
  };

  return (
    <InternalFormatEditor
      simplifiedExpression={simplifiedExpression}
      onChange={handleChange}
      showAddSubexpression={showAddSubexpression}
    />
  );
};
