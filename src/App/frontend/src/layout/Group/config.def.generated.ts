import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class GroupDef extends ContainerComponent<'Group'> {
  protected readonly type = 'Group';

  directRender(): boolean {
    return true;
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Group'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Group'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: f3860d9681a8c2dbcc865bc9befdbf10b2d19744ec4b47588d2b9919e84d0ada
