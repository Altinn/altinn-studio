import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { ActionComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class PDFPreviewButtonDef extends ActionComponent<'PDFPreviewButton'> {
  protected readonly type = 'PDFPreviewButton';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'PDFPreviewButton'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'PDFPreviewButton'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 3b683ee1fe60e8618d25786fcb89ba9616902b25c9812240f12cdef939747879
