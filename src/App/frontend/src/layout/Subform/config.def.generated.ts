import type {
  ComponentBase,
  FormComponentPropsWithRequired,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SubformDef extends FormComponent<'Subform'> {
  protected readonly type = 'Subform';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Subform'>) {
    return {
      ...(props.item as Omit<
        typeof props.item,
        keyof ComponentBase | keyof FormComponentPropsWithRequired | keyof SummarizableComponentProps | 'hidden'
      >),
      ...props.evalBase(),
      ...props.evalFormProps(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Subform'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 9b4c700fc9ed27d0e56799bd366b24423c5354ec905b345ca075aea80c148427
