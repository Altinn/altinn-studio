import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class InstantiationButtonDef extends ActionComponent<'InstantiationButton'> {
  protected readonly type = 'InstantiationButton';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'InstantiationButton'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'InstantiationButton'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: fdd89157ecf2653a789e64389df285acf28d141f4921524e6d8d34bb31faa153
