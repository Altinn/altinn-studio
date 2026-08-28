import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class AttachmentListDef extends PresentationComponent<'AttachmentList'> {
  protected readonly type = 'AttachmentList';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'AttachmentList'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'AttachmentList'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 96d05102b6ed668a0cac03d32ef0ab88d4ef2b1d47f4e0a49f8b6dc8c2af41c9
