import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class DividerDef extends PresentationComponent<'Divider'> {
  protected readonly type = 'Divider';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Divider'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Divider'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 0d2583bb60ae26a1716715530b6241527e9e3b01b40f3f5db5a645a9a34a265a
