import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class IFrameDef extends PresentationComponent<'IFrame'> {
  protected readonly type = 'IFrame';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'IFrame'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'IFrame'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 7c259a7a3157d13e292b6590e7b6600003ab6fd2adabe326acee1fef6f9440b3
