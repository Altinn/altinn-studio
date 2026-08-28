import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class PanelDef extends PresentationComponent<'Panel'> {
  protected readonly type = 'Panel';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Panel'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Panel'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: d76568aaf3c9d03703d704932bd1fa776c0505718cfc319367d9d8df31efe8c9
