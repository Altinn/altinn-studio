import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class LikertItemDef extends FormComponent<'LikertItem'> implements DisplayData {
  protected readonly type = 'LikertItem';

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'LikertItem'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: 83980688620a43b1d226d202ab9724200f8cc17fd29066657233a6b6815b84d8
