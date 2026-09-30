import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class HeadingDef extends PresentationComponent<'Heading'> {
  protected readonly type = 'Heading';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Heading'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Heading'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 70931736fc0f265e7d210f5e5aaa7d9204f033b6632ef4ad090c86b953e96b07
