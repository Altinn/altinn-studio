import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class LikertDef extends ContainerComponent<'Likert'> {
  protected readonly type = 'Likert';

  directRender(): boolean {
    return true;
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Likert'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Likert'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 671704bb1c7777730b22b392d1dd21a2db4552fc1200e2bcb44fcf19cf9f7752
