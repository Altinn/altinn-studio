import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class AlertDef extends PresentationComponent<'Alert'> {
  protected readonly type = 'Alert';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Alert'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Alert'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: fc1be215654c42020d49aab6b35be022cb7d3b19ec83421b77076151484147e4
