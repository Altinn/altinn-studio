import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ActionButtonDef extends ActionComponent<'ActionButton'> {
  protected readonly type = 'ActionButton';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'ActionButton'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'ActionButton'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: e52c5c836dea4991d488d5b59699141dc7d10de1803ddc6e5a7dcb5d2afed2c1
