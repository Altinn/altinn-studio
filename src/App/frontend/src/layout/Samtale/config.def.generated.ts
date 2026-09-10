import type {
  ComponentBase,
  FormComponentProps,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SamtaleDef extends FormComponent<'Samtale'> {
  protected readonly type = 'Samtale';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Samtale'>) {
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
  evalExpressions(props: ExprResolver<'Samtale'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: c166259610d523ee850e32513f60941921aa13bf4fe0b56f647905ecc2d29a28
