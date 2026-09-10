import type {
  ComponentBase,
  FormComponentProps,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class KiAssistentDef extends FormComponent<'KiAssistent'> {
  protected readonly type = 'KiAssistent';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'KiAssistent'>) {
    return {
      ...(props.item as Omit<
        typeof props.item,
        keyof ComponentBase | keyof FormComponentProps | keyof SummarizableComponentProps | 'hidden'
      >),
      ...props.evalBase(),
      ...props.evalFormProps(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'KiAssistent'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 5ecf0d0ed57dee0112aad4f726f538e1a0f9dfa7bed2a0d7ebdb782f6c281876
