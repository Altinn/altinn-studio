import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class CardsDef extends ContainerComponent<'Cards'> {
  protected readonly type = 'Cards';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Cards'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Cards'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: b218d4037d543138d8995178bc69ed3af09da1582e575985531876c9af3e2eaa
