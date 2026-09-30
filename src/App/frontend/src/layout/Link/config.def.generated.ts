import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class LinkDef extends ActionComponent<'Link'> {
  protected readonly type = 'Link';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Link'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Link'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: fdb34bafca2aa3ca7f5a343fb65c0c7bb021a9be2ba23fb7450fdda34ac0f918
