import React from 'react';
import type { StudioExpressionProps } from '@studio/components-legacy';
import { StudioExpression } from '@studio/components-legacy';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

export type ExpressionProps = Omit<StudioExpressionProps, 'texts'>;

export const Expression = (props: ExpressionProps) => {
  const texts = useExpressionTexts();
  return <StudioExpression texts={texts} {...props} />;
};
