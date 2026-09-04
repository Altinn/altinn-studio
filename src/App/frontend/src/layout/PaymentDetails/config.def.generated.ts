import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class PaymentDetailsDef extends PresentationComponent<'PaymentDetails'> {
  protected readonly type = 'PaymentDetails';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'PaymentDetails'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'PaymentDetails'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: b6bda5ce5899dc5adea3c9693b12df9ec1a7ecb8ad2e2faee88254f630a31183
