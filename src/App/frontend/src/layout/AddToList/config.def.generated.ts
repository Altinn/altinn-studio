import { FormComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class AddToListDef extends FormComponent<'AddToList'> {
  protected readonly type = 'AddToList';

  declare renderSummary?: never;

  declare renderSummary2?: never;

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'AddToList'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 49904c6df3219723c7c4781777867e44533ae396148ccde29a99e9f7dc53afdd
