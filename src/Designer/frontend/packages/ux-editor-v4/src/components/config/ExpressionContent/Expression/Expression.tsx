import type { StudioExpressionProps } from '@designer/components';
import { StudioExpression } from '@designer/components';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

export type ExpressionProps = Omit<StudioExpressionProps, 'texts'>;

export const Expression = (props: ExpressionProps) => {
  const texts = useExpressionTexts();
  return <StudioExpression texts={texts} {...props} />;
};
