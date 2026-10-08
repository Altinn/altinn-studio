import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { IPageBreak } from '@app/layout-contract/generated/common.generated';

import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

export function useResolvedPageBreak(pageBreak: IPageBreak | undefined) {
  const breakBefore = useEvalExpression(pageBreak?.breakBefore, CommonExpressions.IPageBreak.breakBefore);
  const breakAfter = useEvalExpression(pageBreak?.breakAfter, CommonExpressions.IPageBreak.breakAfter);
  return pageBreak ? { breakBefore, breakAfter } : undefined;
}
