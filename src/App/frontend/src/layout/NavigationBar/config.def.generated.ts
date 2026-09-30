import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class NavigationBarDef extends ActionComponent<'NavigationBar'> {
  protected readonly type = 'NavigationBar';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'NavigationBar'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'NavigationBar'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 13ad1c6b19311ec5b6fe071622ade709e602eb0d97be061bc70b670877968d5d
