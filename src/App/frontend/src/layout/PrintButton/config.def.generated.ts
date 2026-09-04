import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class PrintButtonDef extends ActionComponent<'PrintButton'> {
  protected readonly type = 'PrintButton';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'PrintButton'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'PrintButton'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: c25ae070f1da5c2d03aeb7e505e31451653e86caf7a6b9c672338fb6472530b5
