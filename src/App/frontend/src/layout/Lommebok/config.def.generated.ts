import type {
  ComponentBase,
  FormComponentProps,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class LommebokDef extends FormComponent<'Lommebok'> {
  protected readonly type = 'Lommebok';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Lommebok'>) {
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
  evalExpressions(props: ExprResolver<'Lommebok'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: ab79617e649ce43338b05e7145b6f97580b3e682704ff58034db499158868cb8
