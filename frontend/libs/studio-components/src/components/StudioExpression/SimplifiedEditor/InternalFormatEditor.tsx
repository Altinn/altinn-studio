import React from 'react';
import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import { LogicalExpressionEditor } from './LogicalExpressionEditor';
import { BooleanEditor } from './BooleanEditor';

export type InternalFormatEditorProps = {
  simplifiedExpression: SimplifiedExpression;
  showAddSubexpression?: boolean;
  onChange: (expression: SimplifiedExpression) => void;
};

export const InternalFormatEditor = ({
  simplifiedExpression,
  showAddSubexpression,
  onChange,
}: InternalFormatEditorProps) => {
  if (typeof simplifiedExpression === 'boolean') {
    return <BooleanEditor expression={simplifiedExpression} onChange={onChange} />;
  } else {
    return (
      <LogicalExpressionEditor
        expression={simplifiedExpression}
        onChange={onChange}
        showAddSubexpression={showAddSubexpression}
      />
    );
  }
};
