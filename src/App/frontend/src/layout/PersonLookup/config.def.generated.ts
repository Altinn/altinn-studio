import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class PersonLookupDef extends FormComponent<'PersonLookup'> implements DisplayData {
  protected readonly type = 'PersonLookup';

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'PersonLookup'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: 7ac6cb1f2e37ee4038c4cb8a1ba4ff0ac707ca6dff50c4c27a32b4d59b20daf9
