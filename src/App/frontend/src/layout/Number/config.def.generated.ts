import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class NumberDef extends PresentationComponent<'Number'> {
  protected readonly type = 'Number';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Number'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }
}

// Source hash: 02cbb54cb49ac0e47bdd37f05fe58fb22fade38c57da500ba8d274e239834f9f
