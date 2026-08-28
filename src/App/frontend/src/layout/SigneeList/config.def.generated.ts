import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SigneeListDef extends PresentationComponent<'SigneeList'> {
  protected readonly type = 'SigneeList';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'SigneeList'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'SigneeList'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 9a37c15d4473d496f21c9ac7559e51ceaf865e6567a2ca31561c8b360d60480a
