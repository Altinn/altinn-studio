import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class VideoDef extends PresentationComponent<'Video'> {
  protected readonly type = 'Video';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Video'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Video'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 836748a9d2c2de9ef007d8a3da6910f9d5f8a31f9def931c7c56dfb46e4136ce
