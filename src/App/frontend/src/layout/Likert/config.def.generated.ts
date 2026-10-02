import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class LikertDef extends ContainerComponent<'Likert'> {
  protected readonly type = 'Likert';

  directRender(): boolean {
    return true;
  }

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Likert'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 9f4ff0e884a386e0bb7094834342e218a438830e0b91a2103e8058118309c911
