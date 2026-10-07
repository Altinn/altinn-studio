import { FormComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class AddToListDef extends FormComponent<'AddToList'> {
  protected readonly type = 'AddToList';

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'AddToList'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 795891038ac1d8702f3b9e33a5f5f13bc1c7e7df05af09baa61670a6b798cb97
