import type {
  ComponentBase,
  FormComponentPropsWithRequired,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class AddToListDef extends FormComponent<'AddToList'> {
  protected readonly type = 'AddToList';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'AddToList'>) {
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
  evalExpressions(props: ExprResolver<'AddToList'>) {
    return this.evalDefaultExpressions(props);
  }

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'AddToList'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 7df57478aa3bcbf23f160dfb4374fa8f3687e73855ad0c8176b1efbcd5e01757
