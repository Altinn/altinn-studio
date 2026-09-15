import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ButtonGroupDef extends ContainerComponent<'ButtonGroup'> {
  protected readonly type = 'ButtonGroup';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'ButtonGroup'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'ButtonGroup'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: eee598897cb55c1ab529faddbaab12f2a0ce6417b50d47daf10faf2ba6d30164
