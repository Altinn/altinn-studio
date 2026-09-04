import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class NavigationButtonsDef extends ActionComponent<'NavigationButtons'> {
  protected readonly type = 'NavigationButtons';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'NavigationButtons'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'NavigationButtons'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 0c5cab224b4b10bc4a0fdec43672bf37b9b261e3b25940e3d007903ae8955716
