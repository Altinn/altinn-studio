import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SigningActionsDef extends ActionComponent<'SigningActions'> {
  protected readonly type = 'SigningActions';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'SigningActions'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'SigningActions'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: cc8dbebc19c389d378be4420186d1fe94decfdd84711d2ccb79f2b228643d91b
