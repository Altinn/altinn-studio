import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ParagraphDef extends PresentationComponent<'Paragraph'> {
  protected readonly type = 'Paragraph';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Paragraph'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Paragraph'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 32ce1c088f7507d82c11717bb011f6fd9ba40edbc34fc9e54da6abcfdb7c8068
