import type {
  ComponentBase,
  FormComponentProps,
  SummarizableComponentProps,
} from '@app/layout-contract/generated/common.generated';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class ImageUploadDef extends FormComponent<'ImageUpload'> implements DisplayData {
  protected readonly type = 'ImageUpload';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'ImageUpload'>) {
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

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'ImageUpload'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: bffc6d4af9702d689020b130a773c33f68a0410a5100eb6b9a3417d1c4b4d947
