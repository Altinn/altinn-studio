import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class RepeatingGroupDef extends ContainerComponent<'RepeatingGroup'> {
  protected readonly type = 'RepeatingGroup';

  directRender(): boolean {
    return true;
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'RepeatingGroup'>) {
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
    bindings: IDataModelBindings<'RepeatingGroup'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 58153e1945928172e4fc5efc85dd1d13bbf910f829d73efd3c64b0556bd3aabf
