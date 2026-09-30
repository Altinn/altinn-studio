import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SigningDocumentListDef extends PresentationComponent<'SigningDocumentList'> {
  protected readonly type = 'SigningDocumentList';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'SigningDocumentList'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'SigningDocumentList'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 7622c82f9bce0b44c167d1ab2cb76f48c00c92bea93916d209abebda41dddb6b
