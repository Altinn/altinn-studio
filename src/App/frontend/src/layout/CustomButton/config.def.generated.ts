import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class CustomButtonDef extends ActionComponent<'CustomButton'> {
  protected readonly type = 'CustomButton';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'CustomButton'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'CustomButton'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: f03cebc2f0fc3aaf3f33d988a59ce0a8506edd1e709d5f474372980fa465f3ee
