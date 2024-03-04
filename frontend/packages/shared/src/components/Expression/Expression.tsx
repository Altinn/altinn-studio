import type { StudioExpressionProps } from '@studio/components';
import { StudioExpression } from '@studio/components';
import { useExpressionTexts } from './useExpressionTexts';
import React from 'react';

export type ExpressionProps = Omit<StudioExpressionProps, 'texts'>;

export const Expression = (props: ExpressionProps) => {
  const texts = useExpressionTexts();
  return <StudioExpression texts={texts} {...props} />;
};
