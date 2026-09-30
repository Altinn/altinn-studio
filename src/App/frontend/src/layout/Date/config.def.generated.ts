import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class DateDef extends PresentationComponent<'Date'> {
  protected readonly type = 'Date';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Date'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }
}

// Source hash: 4686039a64caa9bad7f23c0f6cade684a8eb4c10949fff90800fa1ee55d37975
