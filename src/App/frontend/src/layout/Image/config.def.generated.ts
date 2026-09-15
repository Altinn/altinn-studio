import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ImageDef extends PresentationComponent<'Image'> {
  protected readonly type = 'Image';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Image'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Image'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 0c9cd4b5b041527628b0c07299614fc335ac1262ee4870dfef1a5ae6318f3e0a
