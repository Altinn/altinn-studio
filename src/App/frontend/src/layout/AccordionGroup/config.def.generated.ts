import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class AccordionGroupDef extends ContainerComponent<'AccordionGroup'> {
  protected readonly type = 'AccordionGroup';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'AccordionGroup'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'AccordionGroup'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 6d176a8274367bf50891376fe7cefb2d3ff244505e91e45a5562c7165eac4681
