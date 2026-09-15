import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ButtonDef extends ActionComponent<'Button'> {
  protected readonly type = 'Button';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Button'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Button'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 5a08d37339fd832066ffa186f9931568c41fd1d73e3bb0b76a6495375ffe94d3
