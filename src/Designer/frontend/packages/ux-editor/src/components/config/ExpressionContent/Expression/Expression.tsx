import React from 'react';
import type { StudioExpressionProps } from 'libs/studio-components-legacy/src';
import { StudioExpression } from 'libs/studio-components-legacy/src';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

export type ExpressionProps = Omit<StudioExpressionProps, 'texts'>;

export const Expression = (props: ExpressionProps) => {
  const texts = useExpressionTexts();
  return <StudioExpression texts={texts} {...props} />;
};
