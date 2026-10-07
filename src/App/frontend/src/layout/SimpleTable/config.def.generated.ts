import { FormComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class SimpleTableDef extends FormComponent<'SimpleTable'> {
  protected readonly type = 'SimpleTable';

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'SimpleTable'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 34f1350ef136f324f951678c3c0a1a542a681fe1e51e733138b6144ae3c46626
